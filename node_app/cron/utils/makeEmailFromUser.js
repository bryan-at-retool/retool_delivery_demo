var {internet: {domainName}, fake} = require('faker');
var common_domains = ['gmail.com','yahoo.com', 'icloud.net', 'hotmail.com', 'gmail.com']
const moment = require('moment');

const makeEmailFromUser = (user) => {
  const { n,first_name, last_name, birthdate} = user
  const emailType = () => {
    let base = ''
    switch (false) {
      case (n[0] < 0.4):
        base = emailFLast();
        break;
      case (n[0] < 0.6):
        base = emailFirstL();
        break;
      case (n[0] < 0.85):
        base = emailFML();
        break;
      default:
        base = getRandom();
    }
    let suffix = getSuffix();
    return base+suffix
  }

  const getSuffix = () => {
    const dot = (n[5] < 0.2) ? '.':''
    const rand = n[3]
    let out = ''
    switch (true) {
      case (rand<0.2):
        out = `${dot}${moment(birthdate).year()}`.substring(2);
      case (rand<0.4):
        out = `${dot}${moment(birthdate).year()}`;
      case (rand<0.6):
        out = `${dot}${moment(birthdate).format('MMDD')}`;
    }
    return out
  }

  const workOrCommon = () => {
    const threshold = 0.7;
    const rand = n[1];
    if (rand<threshold) {
      const index = Math.floor(rand*(1/threshold)*common_domains.length)
      return common_domains[index]
    } else {
      return domainName()
    }
  }

  const emailFLast = () => {
    return `${first_name[0]}${getDot()}${last_name}`
  }

  const getDot = () => {return (n[2] < 0.5) ? '.':'' }

  const emailFirstL = () => {
    return `${first_name}${getDot()}${last_name[0]}`
  }

  const getRandom = () => {
    let faker_categories = [
      'commerce.color',
      'commerce.productMaterial',
      'company.catchPhraseNoun',
      'company.catchPhraseAdjective',
      'company.catchPhraseDescriptor',
      'company.bs',
      'animal.type'
    ].map(w=>`{{${w}}}`).join(' ')
    const faked = fake(faker_categories)
    const shuffled = faked.split(' ').sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2).join('')
  }

  const emailFML = () => {
    const middle = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(n[6]*26)]
    return `${first_name[0]}${middle}${last_name[0]}`
  }

  const email = emailType(user)
  const domain = workOrCommon()
  return `${email}@${domain}`.replace(/[^a-zA-Z0-9_/-@.]/g,'').toLowerCase();
}


module.exports = makeEmailFromUser;