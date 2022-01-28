SET check_function_bodies = false;
CREATE FUNCTION public.create_refund_alert() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
BEGIN
   if NEW.credit_amount > 100
	then 
		insert into public.alerts(
			type,
			status,
			description,
			foreign_source,
			foreign_key
		) values (
			'Large Refund',
			'Open',
			CONCAT('A large refund was created by a colleague for $',CAST(NEW.credit_amount as VARCHAR), '.') ,
			'refund',
			NEW.id
		);
	end if;
	RETURN NEW;
END;
$_$;
CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.addresses (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address1 character varying,
    address2 character varying,
    address3 character varying,
    city character varying,
    state_province character varying,
    country character varying,
    zip_postal character varying,
    location point,
    is_primary boolean NOT NULL,
    foreign_source character varying,
    foreign_key integer,
    address_formatted character varying
);
CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;
CREATE TABLE public.alerts (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying,
    status character varying,
    description text,
    type character varying,
    foreign_source character varying,
    foreign_key integer,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;
CREATE TABLE public.audience_queries (
    id integer NOT NULL,
    name character varying(40),
    description text,
    query_text text
);
CREATE SEQUENCE public.audience_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.audience_queries_id_seq OWNED BY public.audience_queries.id;
CREATE TABLE public.deliveries (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    order_id integer NOT NULL,
    user_id integer NOT NULL,
    delivery_user_id integer NOT NULL,
    store_id integer NOT NULL,
    address_id integer NOT NULL,
    store_location point NOT NULL,
    delivery_location point NOT NULL,
    is_delivered boolean NOT NULL,
    delivery_route jsonb,
    status character varying
);
CREATE TABLE public.orders (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    store_id integer NOT NULL,
    address_id integer NOT NULL,
    amount numeric,
    estimated_ready_at timestamp with time zone NOT NULL,
    estimated_delivery_start timestamp with time zone NOT NULL,
    estimated_delivery_end timestamp with time zone NOT NULL,
    has_delivery boolean DEFAULT false,
    coupon_code character varying
);
CREATE TABLE public.stores (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    brand character varying NOT NULL,
    store_hours character varying NOT NULL,
    address_id integer,
    location point,
    internal_name character varying,
    store_url character varying,
    phone_number character varying
);
CREATE TABLE public.users (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    birthdate date,
    gender character varying,
    is_delivery_driver boolean NOT NULL,
    last_location point,
    email character varying,
    phone_number character varying,
    full_name character varying GENERATED ALWAYS AS ((((first_name)::text || (' '::character varying)::text) || (last_name)::text)) STORED
);
CREATE VIEW public.open_deliveries AS
 SELECT deliveries.id,
    deliveries.status,
    deliveries.order_id,
    deliveries.user_id,
    deliveries.delivery_user_id,
    deliveries.store_id,
    deliveries.store_location,
    deliveries.delivery_location,
    deliveries.is_delivered,
    (((customers.first_name)::text || ' '::text) || (customers.last_name)::text) AS customer_full_name,
    customers.email AS customer_email,
    customers.phone_number AS customer_phone_number,
    (((drivers.first_name)::text || ' '::text) || (drivers.last_name)::text) AS driver_full_name,
    drivers.email AS driver_email,
    drivers.phone_number AS driver_phone_number,
    orders.estimated_ready_at,
    orders.estimated_delivery_start,
    orders.estimated_delivery_end,
    orders.amount,
    orders.coupon_code,
    stores.name AS store_name,
    stores.brand AS store_brand,
    deliveries.delivery_route,
    (((((deliveries.delivery_route -> 'legs'::text) -> 0) -> 'duration'::text) -> 'value'::text))::integer AS door_to_door_seconds,
    (((((deliveries.delivery_route -> 'legs'::text) -> 0) -> 'duration'::text) ->> 'text'::text))::character varying AS door_to_door_text,
        CASE
            WHEN (((deliveries.status)::text = ('Ordered'::character varying)::text) AND (orders.estimated_ready_at <= CURRENT_TIMESTAMP)) THEN 'Late Fulfillment'::character varying
            WHEN (((deliveries.status)::text = ('Ready'::character varying)::text) AND (orders.estimated_delivery_end < CURRENT_TIMESTAMP)) THEN 'Late Driver Pickup'::character varying
            WHEN (((deliveries.status)::text = ('Ready'::character varying)::text) AND (orders.estimated_delivery_start < CURRENT_TIMESTAMP)) THEN 'Expected Late Driver Pickup'::character varying
            WHEN (((deliveries.status)::text = ('En Route'::character varying)::text) AND (orders.estimated_delivery_end <= CURRENT_TIMESTAMP)) THEN 'Late Delivery'::character varying
            ELSE 'No Action'::character varying
        END AS action_required,
    deliveries.updated_at,
    stores.phone_number AS store_phone_number
   FROM public.deliveries,
    public.orders,
    public.users customers,
    public.users drivers,
    public.stores
  WHERE ((deliveries.order_id = orders.id) AND (deliveries.is_delivered = false) AND (deliveries.user_id = customers.id) AND (deliveries.delivery_user_id = drivers.id) AND (deliveries.store_id = stores.id));
CREATE VIEW public.available_drivers AS
 SELECT users.id,
    users.full_name
   FROM public.users
  WHERE (users.is_delivery_driver AND (NOT (users.id IN ( SELECT open_deliveries.delivery_user_id
           FROM public.open_deliveries))))
  ORDER BY (random())
 LIMIT 15;
CREATE TABLE public.demo_catalog (
    id integer NOT NULL,
    json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by character varying
);
CREATE SEQUENCE public.catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.catalog_id_seq OWNED BY public.demo_catalog.id;
CREATE TABLE public.configurable_modules (
    id integer NOT NULL,
    app_id character varying(255),
    module_id character varying(255),
    module_type character varying(255),
    form_data json
);
CREATE SEQUENCE public.configurable_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.configurable_modules_id_seq OWNED BY public.configurable_modules.id;
CREATE TABLE public.coupons (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    code character varying NOT NULL,
    category character varying NOT NULL,
    coupon_amount numeric,
    coupon_type character varying,
    campaign_id integer,
    expires_at timestamp with time zone
);
CREATE SEQUENCE public.coupons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;
CREATE TABLE public.refunds (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_amount numeric,
    category character varying,
    reason text,
    other_description text,
    order_id integer,
    user_id integer
);
CREATE SEQUENCE public.credits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.credits_id_seq OWNED BY public.refunds.id;
CREATE VIEW public.current_deliveries AS
 SELECT deliveries.id,
    deliveries.status,
    (((customers.first_name)::text || ' '::text) || (customers.last_name)::text) AS customer_full_name,
    customers.email AS customer_email,
    (((drivers.first_name)::text || ' '::text) || (drivers.last_name)::text) AS driver_full_name,
    drivers.phone_number AS driver_phone_number,
    orders.estimated_delivery_end,
    orders.amount,
    orders.coupon_code,
    stores.name AS store_name,
    stores.brand AS store_brand,
    (((((deliveries.delivery_route -> 'legs'::text) -> 0) -> 'duration'::text) -> 'value'::text))::integer AS door_to_door_seconds
   FROM public.deliveries,
    public.orders,
    public.users customers,
    public.users drivers,
    public.stores
  WHERE ((deliveries.is_delivered = false) AND (deliveries.order_id = orders.id) AND (deliveries.user_id = customers.id) AND (deliveries.delivery_user_id = drivers.id) AND (deliveries.store_id = stores.id));
CREATE SEQUENCE public.deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deliveries_id_seq OWNED BY public.deliveries.id;
CREATE TABLE public.grid_test (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.healthcare_scratch (
    id integer NOT NULL,
    name character varying(100),
    birthdate date,
    gender character varying(100),
    appointment_datetime timestamp without time zone,
    doctor_name character varying(100),
    appointment_reason character varying(100),
    patient_id character varying(100)
);
CREATE SEQUENCE public.healthcare_scratch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.healthcare_scratch_id_seq OWNED BY public.healthcare_scratch.id;
CREATE TABLE public.issues (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category character varying NOT NULL,
    comment text NOT NULL,
    user_id integer NOT NULL,
    order_id integer NOT NULL,
    status text,
    closed_at timestamp without time zone
);
CREATE SEQUENCE public.issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;
CREATE TABLE public.kyc_events (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type character varying,
    due timestamp with time zone DEFAULT (now() + '3 days'::interval) NOT NULL,
    title character varying,
    description text,
    user_id integer NOT NULL,
    flag character varying,
    flag_reason character varying,
    status character varying,
    risk character varying
);
CREATE VIEW public.user_addresses AS
 SELECT addresses.id,
    addresses.created_at,
    addresses.updated_at,
    addresses.address1,
    addresses.address2,
    addresses.address3,
    addresses.city,
    addresses.state_province,
    addresses.country,
    addresses.zip_postal,
    addresses.location,
    addresses.is_primary,
    addresses.foreign_source,
    addresses.foreign_key,
    addresses.address_formatted
   FROM public.addresses
  WHERE ((addresses.foreign_source)::text = 'user'::text);
CREATE VIEW public.kyc_actions AS
 SELECT kyc_events.id,
    kyc_events.created_at,
    kyc_events.due,
    kyc_events.event_type,
    kyc_events.title,
    kyc_events.description,
    kyc_events.flag,
    users.full_name,
    user_addresses.city,
    user_addresses.state_province,
    user_addresses.country,
    user_addresses.zip_postal
   FROM public.kyc_events,
    public.users,
    ( SELECT user_addresses_1.id,
            user_addresses_1.created_at,
            user_addresses_1.updated_at,
            user_addresses_1.address1,
            user_addresses_1.address2,
            user_addresses_1.address3,
            user_addresses_1.city,
            user_addresses_1.state_province,
            user_addresses_1.country,
            user_addresses_1.zip_postal,
            user_addresses_1.location,
            user_addresses_1.is_primary,
            user_addresses_1.foreign_source,
            user_addresses_1.foreign_key,
            user_addresses_1.address_formatted
           FROM public.user_addresses user_addresses_1
          WHERE user_addresses_1.is_primary) user_addresses
  WHERE ((users.id = kyc_events.user_id) AND (users.id = user_addresses.foreign_key) AND ((kyc_events.status)::text <> 'Completed'::text));
CREATE SEQUENCE public.kyc_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.kyc_event_id_seq OWNED BY public.kyc_events.id;
CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;
CREATE TABLE public.ratings (
    id integer NOT NULL,
    rating integer NOT NULL,
    user_id integer NOT NULL,
    order_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_user_id integer NOT NULL
);
CREATE SEQUENCE public.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;
CREATE TABLE public.saved_segments (
    id integer NOT NULL,
    name character varying(40),
    description text,
    query_text text,
    rpn_object character varying(40)
);
CREATE SEQUENCE public.saved_segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.saved_segments_id_seq OWNED BY public.saved_segments.id;
CREATE VIEW public.store_addresses AS
 SELECT addresses.id,
    addresses.created_at,
    addresses.updated_at,
    addresses.address1,
    addresses.address2,
    addresses.address3,
    addresses.city,
    addresses.state_province,
    addresses.country,
    addresses.zip_postal,
    addresses.location,
    addresses.is_primary,
    addresses.foreign_source,
    addresses.foreign_key,
    addresses.address_formatted
   FROM public.addresses
  WHERE (((addresses.foreign_source)::text = 'store'::text) AND (addresses.is_primary = true));
CREATE SEQUENCE public.stores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.stores_id_seq OWNED BY public.stores.id;
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);
ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);
ALTER TABLE ONLY public.audience_queries ALTER COLUMN id SET DEFAULT nextval('public.audience_queries_id_seq'::regclass);
ALTER TABLE ONLY public.configurable_modules ALTER COLUMN id SET DEFAULT nextval('public.configurable_modules_id_seq'::regclass);
ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);
ALTER TABLE ONLY public.deliveries ALTER COLUMN id SET DEFAULT nextval('public.deliveries_id_seq'::regclass);
ALTER TABLE ONLY public.demo_catalog ALTER COLUMN id SET DEFAULT nextval('public.catalog_id_seq'::regclass);
ALTER TABLE ONLY public.healthcare_scratch ALTER COLUMN id SET DEFAULT nextval('public.healthcare_scratch_id_seq'::regclass);
ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);
ALTER TABLE ONLY public.kyc_events ALTER COLUMN id SET DEFAULT nextval('public.kyc_event_id_seq'::regclass);
ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);
ALTER TABLE ONLY public.ratings ALTER COLUMN id SET DEFAULT nextval('public.ratings_id_seq'::regclass);
ALTER TABLE ONLY public.refunds ALTER COLUMN id SET DEFAULT nextval('public.credits_id_seq'::regclass);
ALTER TABLE ONLY public.saved_segments ALTER COLUMN id SET DEFAULT nextval('public.saved_segments_id_seq'::regclass);
ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audience_queries
    ADD CONSTRAINT audience_queries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.demo_catalog
    ADD CONSTRAINT catalog_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.configurable_modules
    ADD CONSTRAINT configurable_modules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT credits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grid_test
    ADD CONSTRAINT grid_test_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.kyc_events
    ADD CONSTRAINT kyc_event_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.saved_segments
    ADD CONSTRAINT saved_segments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
CREATE TRIGGER refund_alert AFTER INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.create_refund_alert();
CREATE TRIGGER set_public_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_addresses_updated_at ON public.addresses IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_alerts_updated_at ON public.alerts IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_catalog_updated_at BEFORE UPDATE ON public.demo_catalog FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_catalog_updated_at ON public.demo_catalog IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_coupons_updated_at ON public.coupons IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_credits_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_credits_updated_at ON public.refunds IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_deliveries_updated_at ON public.deliveries IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_grid_test_updated_at BEFORE UPDATE ON public.grid_test FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_grid_test_updated_at ON public.grid_test IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_issues_updated_at ON public.issues IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_kyc_event_updated_at BEFORE UPDATE ON public.kyc_events FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_kyc_event_updated_at ON public.kyc_events IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_orders_updated_at ON public.orders IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_ratings_updated_at ON public.ratings IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_stores_updated_at ON public.stores IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_users_updated_at ON public.users IS 'trigger to set value of column "updated_at" to current timestamp on row update';
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
