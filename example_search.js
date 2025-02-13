import { YoutubeSearch } from './yt_finder.js';

async function main() {
    const search = new YoutubeSearch("javascript", { maxResults: 5 });
    const results = await search.search();

    if (results && results.length > 0) {
        results.forEach((video) => {
            console.log(video)
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