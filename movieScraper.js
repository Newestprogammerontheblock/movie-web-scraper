import puppeteer from "puppeteer";
import fs from "fs";
import express from "express";
import path from "./path.js";

 async function scrapeMovieLinks() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let seen = new Set();
  let allLinks = [];
  await page.goto("https://archive.org/details/Film_Noir", {
    waitUntil: "networkidle0",
  });

  await page.setViewport({ width: 1000, height: 1024 });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  let prevCount = 0;
  let failures = 0;
  const MAX_FAILURES = 5;

  while (MAX_FAILURES > failures) {
    let currentCount = await page.evaluate((path) => {
      function shadowCrawler(path) {
        let start = document;

        for (let step of path) {
          start = start.querySelector(step.selector);
          if (!start) return null;
          if (step.shadow) start = start.shadowRoot;
        }
        return start;
      }

      let container = shadowCrawler(path);
      return container.querySelectorAll("article").length;
    }, path);
    if (currentCount == prevCount) {
      failures++;
    } else {
      failures = 0;
    }
    if (failures >= MAX_FAILURES) {
      console.log("No more content found");
      break;
    }
    prevCount = currentCount;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise((r) => setTimeout(r, 1000));

    let nextBatch = await page.evaluate((path) => {
      function shadowCrawler(path) {
        let start = document;

        for (let step of path) {
          start = start.querySelector(step.selector);

          if (step.shadow) start = start.shadowRoot;
        }
        return start;
      }
      let container = shadowCrawler(path);
      if (!container) return [];

      let articles = container.querySelectorAll("article");
      let hrefs = [];

      articles.forEach((article) => {

        let tileDispatcher = article.querySelector("tile-dispatcher");
        let div = tileDispatcher?.shadowRoot?.querySelector("#container");
        if (!div) return;

        let anchors = div.querySelectorAll("a");
        anchors.forEach((a) => {
          if (a.href) hrefs.push(a.href);
        });
      });
      return hrefs;
    }, path);

    nextBatch.forEach((link) => {
      if (!seen.has(link)) {
        seen.add(link);
        allLinks.push(link);
      }
    });
    console.log("next Batch:", nextBatch);
  }

function writeMovieData(links) {
  try {
    const output = links.map(link => ({
      title: "",
      link: link.replace(/^"+|"+$/g, ""),
      description: "",
      embedCode: "",
      category: "",
      thumbnail: "",
      identifier: link.split("/").pop().replace(/^"+|"+$/g, ""),
      license: "",
      duration: ""
    }));

    fs.writeFileSync("", JSON.stringify(output, null, 2));
    console.log("All done!");
  } catch (err) {
    console.error("Error writing files", err);
  }
}

writeMovieData(allLinks);
  await browser.close();
}
scrapeMovieLinks()
