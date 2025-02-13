# yt-finder-js - YouTube Search without the API (JavaScript)

A JavaScript library for searching YouTube videos by scraping the YouTube website, avoiding the limitations of the official API.

## Features

*   **API-Free:** Searches YouTube videos without requiring an API key.
*   **Lightweight:** Minimal dependencies for simple and fast searching.
*   **Easy to Use:** Simple and intuitive API.
*   **Asynchronous:** Uses `async/await` for efficient non-blocking operations.

## Installation

```bash
npm install yt-finder-js
```
## Usage

```js
import { YoutubeSearch } from 'yt-finder-js';

async function main() {
    const search = new YoutubeSearch("javascript", { maxResults: 5 });
    const results = await search.search();

    if (results && results.length > 0) {
        results.forEach(video => {
            console.log("=".repeat(20));
            console.log(`Title: ${video.title}`);
            console.log(`URL: ${video.ytUrl}`);
            console.log("=".repeat(20));
        });
    } else {
        console.log("No results found.");
    }
}

main();
```