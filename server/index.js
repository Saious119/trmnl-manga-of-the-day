const express = require("express");
const app = express();
const testJson = require("./testData");

var query = `query Page($page: Int, $type: MediaType, $isAdult: Boolean, $startDateGreater: FuzzyDateInt, $startDateLesser: FuzzyDateInt, $averageScoreGreater: Int) {
  Page(page: $page) {
    pageInfo {
      currentPage
      hasNextPage
    }
    media(type: $type, isAdult: $isAdult, startDate_greater: $startDateGreater, startDate_lesser: $startDateLesser, averageScore_greater: $averageScoreGreater) {
      averageScore
      chapters
      coverImage {
        extraLarge
      }
      description
      endDate {
        year
      }
      genres
      startDate {
        year
      }
      staff {
        edges {
          node {
            name {
              full
            }
          }
          role
        }
      }
      status
      title {
        english
        romaji
      }
      volumes
    }
  }
}`;

var variables = {
  type: "MANGA",
  isAdult: false,
  startDateGreater: 20080101,
  startDateLesser: 20090101,
  averageScoreGreater: 0,
  page: 1,
};

var mangaOfTheDay = null; // Variable to store the selected Manga of the day
var lastUpdated = new Date().toISOString(); // Initialize lastUpdated with the current date and time
var apiTries = 0; // Counter for API tries, we are limited to 30 a day

app.use(express.json()); // Middleware to parse JSON bodies

function isDifferentDay(date1, date2) {
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  );
}

// Function to fetch data from AniList API
async function fetchMangaData(query, variables) {
  const url = "https://graphql.anilist.co";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log("Data fetched successfully");
      return data; // Return the JSON response
    } else {
      console.log("Error fetching data:", data);
      throw new Error("Failed to fetch data");
    }
  } catch (error) {
    console.log("Fetch error:", error);
    throw error;
  }
}

async function SelectRandomManga(mediaArray) {
  const randomIndex = Math.floor(Math.random() * mediaArray.length);
  return mediaArray[randomIndex];
}

async function GetAllMangaPages(query, variables) {
  var randomYear = Math.floor(
    1968 + Math.pow(Math.random(), 0.48) * (2025 - 1968 + 1)
  );
  variables.startDateGreater = parseInt(randomYear + "0101");
  variables.startDateLesser = parseInt(randomYear + 1 + "0101");
  var result = await fetchMangaData(query, variables); // Use the new function
  while (result.data.Page.media.length == 0 && apiTries < 15) {
    apiTries++; // Increment the API tries counter
    console.log("No media found, trying again...");
    variables.page = 1; // Reset page to 1 for each new request
    randomYear = Math.floor(
      1968 + Math.pow(Math.random(), 0.48) * (2025 - 1968 + 1)
    );
    variables.startDateGreater = parseInt(randomYear + "0101");
    variables.startDateLesser = parseInt(randomYear + 1 + "0101");

    result = await fetchMangaData(query, variables); // Retry fetching data if no media found
  }
  if (result.data.Page.pageInfo.hasNextPage) {
    console.log("Fetching additional pages...");
    const numPagesFetched = 1; // We have already fetched the first page
    while (result.data.Page.pageInfo.hasNextPage && numPagesFetched <= 5) {
      variables.page += 1; // Increment the page number
      const nextPageResult = await fetchMangaData(query, variables); // Fetch the next page
      result.data.Page.media.push(...nextPageResult.data.Page.media); // Append the new media to the existing array
      result.data.Page.pageInfo = nextPageResult.data.Page.pageInfo; // Update pageInfo with the new data
    }
  }
  return result; // Return the complete result with all pages
}

app.get("/data", async (req, res) => {
  if (
    mangaOfTheDay == null ||
    isDifferentDay(new Date(lastUpdated), new Date())
  ) {
    console.log("Fetching new Manga of the day");
    console.log("Last updated: ", lastUpdated);
    console.log("Current date: ", new Date());
    console.log(JSON.stringify(mangaOfTheDay));
    const minRating = Math.floor(Math.pow(Math.random(), 0.44) * 80); // Random popularity value
    currentRating = 0;
    console.log("Minimum Rating: ", minRating);

    apiTries = 0; //we are in a new day, reset the tries
    variables.page = 1; // Reset page to 1 for each new request

    try {
      while (
        (currentRating < minRating || genreList == "Ecchi") &&
        apiTries < 15
      ) {
        const result = await GetAllMangaPages(query, variables); // Fetch all pages of Manga data
        mangaOfTheDay = await SelectRandomManga(result.data.Page.media); // Select a random Manga from the result
        currentRating = mangaOfTheDay.averageScore;
        englishName = mangaOfTheDay.title.english; // Get the English name of the selected Manga
        genreList = mangaOfTheDay.genres; // Get the genres of the selected Manga
        console.log(
          `Selected Manga: ${englishName}, Rating: ${currentRating}, Genres: ${genreList}`
        );
        apiTries++; // Increment the API tries counter
      }
      console.log("Selected Manga:", mangaOfTheDay); // Log the selected Manga
      res.json(mangaOfTheDay); // Send the result back to the client
    } catch (error) {
      console.log("Error occurred, returning test JSON:", error);
      res.json(testJson); // In case of error, return the test JSON so the user still gets something
    }
  } else {
    console.log("Returning cached Manga of the day");
    res.json(mangaOfTheDay); // Return the cached Manga of the day
  }
});

app.get("/test", async (req, res) => {
  console.log("Test endpoint hit");
  res.json(testJson);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
