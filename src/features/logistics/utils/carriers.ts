import { commonCarriers } from '../data/schema'

function uniqueCarriers(carriers: string[]) {
  return carriers.filter((carrier, index) => carriers.indexOf(carrier) === index)
}

export function getPreferredCarriers() {
  const sfCarrier = commonCarriers[0]
  const ztoCarrier = commonCarriers[3]

  return uniqueCarriers([
    sfCarrier,
    ztoCarrier,
    ...commonCarriers,
  ]).filter(Boolean)
}
