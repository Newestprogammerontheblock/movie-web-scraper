import fs from "fs"
import puppeteer from "puppeteer"

async function getMovieData() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  let movies = JSON.parse(fs.readFileSync("movie-data/film_noir.json", "utf8"))

  for (let i = 0; i < movies.length; i++) {
    let movie = movies[i]
    if (!movie.link || !movie.link.startsWith("http")) {
      console.warn(`Skipping invalid URL at index ${i}`)
      continue
    }

    console.log(`Processing (${i + 1}/${movies.length}): ${movie.link}`)

    try {
      await page.goto(movie.link, {
        waitUntil: "domcontentloaded",
        timeout: 15000, // cap at 15s per movie
      })

      const movieEl = await page.waitForSelector("#share-button > span.icon-label", {
        timeout: 8000,
      })
      await page.evaluate((el) => el.click(), movieEl)
      let embedcode = await page.waitForSelector("#embedcodehere", {timeout: 4000})

      const movieText = await page.evaluate(
        (el) => el?.textContent?.trim() || "Untitled",
        embedcode
      )

      if (!movieText || movieText === "Untitled") {
        console.warn(`Empty or fallback title at index ${i}: ${movie.link}`)
      } else {
        console.log(`✔️ Got embed code: ${movieText}`)
        movie.embedCode = movieText
      }
    } catch (err) {
      console.error(`❌ Error at index ${i}: ${movie.link}`)
      console.error(err.message || err)
      continue
    }

    // Periodically save progress
    if (i % 10 === 0) {
      fs.writeFileSync("movie-data/film_noir.json", JSON.stringify(movies, null, 2), "utf8")
    }
  }

  // Final write
  fs.writeFileSync("movie-data/film_noir.json", JSON.stringify(movies, null, 2), "utf8")
  await browser.close()
}

getMovieData()
export default getMovieData
