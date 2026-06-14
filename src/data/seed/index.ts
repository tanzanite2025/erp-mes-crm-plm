import auth from './auth.json'
import basic from './basic.json'
import engineering from './engineering.json'
import inventory from './inventory.json'
import production from './production.json'
import trading from './trading.json'

export const seedData = {
  ...auth,
  ...basic,
  ...engineering,
  ...production,
  ...trading,
  ...inventory,
}
