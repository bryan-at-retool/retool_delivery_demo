var PD = require("probability-distributions");

const customBetaIndex = (len, alpha=0.75, betaP=1) => {
  return Math.floor(PD.rbeta(1, alpha, betaP)[0]*(len))
}

module.exports = {
  customBetaIndex
}