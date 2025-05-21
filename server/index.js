const express = require("express");
const app = express();

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
  while (result.data.Page.media.length == 0 && apiTries < 10) {
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
    while (result.data.Page.pageInfo.hasNextPage && apiTries < 15) {
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
    lastUpdated = new Date().toISOString(); // Update lastUpdated to the current date and time
    const minRating = Math.floor(Math.pow(Math.random(), 0.44) * 80); // Random popularity value
    currentRating = 0;
    console.log("Minimum Rating: ", minRating);

    apiTries = 0; //we are in a new day, reset the tries
    variables.page = 1; // Reset page to 1 for each new request

    try {
      while (currentRating < minRating && apiTries < 15) {
        const result = await GetAllMangaPages(query, variables); // Fetch all pages of Manga data
        mangaOfTheDay = await SelectRandomManga(result.data.Page.media); // Select a random Manga from the result
        currentRating = mangaOfTheDay.averageScore;
        englishName = mangaOfTheDay.title.english; // Get the English name of the selected Manga
        apiTries++; // Increment the API tries counter
      }
      console.log("Selected Manga:", mangaOfTheDay); // Log the selected Manga
      res.json(mangaOfTheDay); // Send the result back to the client
    } catch (error) {
      res.status(500).json({ error: "An error occurred" });
    }
  } else {
    console.log("Returning cached Manga of the day");
    res.json(mangaOfTheDay); // Return the cached Manga of the day
  }
});

app.get("/test", async (req, res) => {
  console.log("Test endpoint hit");
  const testJson = {
    averageScore: 81,
    chapters: 176,
    coverImage: {
      extraLarge:
        "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx39711-tjPWXT1AW321.jpg",
    },
    description:
      "Average student Moritaka Mashiro enjoys drawing for fun. When his classmate and aspiring writer Akito Takagi discovers his talent, he begs Moritaka to team up with him as a manga-creating duo. But what exactly does it take to make it in the manga-publishing world?\n<br><br>\n(Source: Viz Media)",
    endDate: {
      year: 2012,
    },
    genres: ["Comedy", "Drama", "Romance", "Slice of Life"],
    startDate: {
      year: 2008,
    },
    staff: {
      edges: [
        {
          node: {
            name: {
              full: "Takeshi Obata",
            },
          },
          role: "Art",
        },
        {
          node: {
            name: {
              full: "Tsugumi Ooba",
            },
          },
          role: "Story",
        },
        {
          node: {
            name: {
              full: "Thibaud Desbief",
            },
          },
          role: "Translator (French)",
        },
        {
          node: {
            name: {
              full: "Edward Kondo",
            },
          },
          role: "Translator (Portuguese)",
        },
        {
          node: {
            name: {
              full: "Karolina Dwornik",
            },
          },
          role: "Translator (Polish: vols 1-4)",
        },
        {
          node: {
            name: {
              full: "Marc Bernabé",
            },
          },
          role: "Translator (Spanish)",
        },
        {
          node: {
            name: {
              full: "Agnieszka Zychma",
            },
          },
          role: "Translator (Polish: vols 13-20)",
        },
        {
          node: {
            name: {
              full: "Aleksandra Kulińska",
            },
          },
          role: "Translator (Polish: vols 5-12)",
        },
        {
          node: {
            name: {
              full: "Souichi Aida",
            },
          },
          role: "Editor (2008-2010)",
        },
        {
          node: {
            name: {
              full: "Kengo Monji",
            },
          },
          role: "Editor (2010-2012)",
        },
      ],
    },
    status: "FINISHED",
    title: {
      english: "Bakuman。",
      romaji: "Bakuman.",
    },
    volumes: 20,
  };

  res.json(testJson); // Send the JSON object as the response
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
