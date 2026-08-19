import * as db from '../build/data/mongodb.js'

async function test() {
  try {
    const res1 = await db.reviewsCollection.find({ product: 1 })
    console.log('Result for { product: 1 }:', res1.length)
    const res2 = await db.reviewsCollection.find({ product: '1' })
    console.log('Result for { product: "1" }:', res2.length)
    const res3 = await db.reviewsCollection.find({ $or: [{ product: 1 }, { product: '1' }] })
    console.log('Result for $or:', res3.length)
  } catch (err) {
    console.error('Error in test:', err)
  }
}

test()
