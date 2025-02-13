import fetch from 'node-fetch';

class VideoResult {
    constructor(data) {
        this.id = data.id || null;
        this.thumbnails = data.thumbnails || [];
        this.title = data.title || null;
        this.longDesc = data.long_desc || null;
        this.channel = data.channel || null;
        this.duration = data.duration || null;
        this.views = data.views || null;
        this.publishTime = data.publish_time || null;
        this.urlSuffix = data.url_suffix || null;
        this.ytUrl = data.yt_url || null;
    }

    static fromDict(data) {
        return new VideoResult(data);
    }

    toDict() {
        return {
            id: this.id,
            thumbnails: this.thumbnails,
            title: this.title,
            long_desc: this.longDesc,
            channel: this.channel,
            duration: this.duration,
            views: this.views,
            publish_time: this.publishTime,
            url_suffix: this.urlSuffix,
            yt_url: this.ytUrl,
        };
    }

    toJson() {
        return JSON.stringify(this.toDict());
    }
}

/**
 * A class that performs YouTube searches and retrieves video results.
 */
class YoutubeSearch {
    /**
     * Create a YoutubeSearch instance.
     * @param {string} searchTerms - The search query terms.
     * @param {Object} [options] - Optional parameters.
     * @param {number} [options.maxResults] - Maximum number of results to retrieve.
     * @param {string} [options.language] - Language parameter for the search.
     * @param {string} [options.region] - Region parameter for the search.
     * @param {number} [options.sleepTime=0.5] - Sleep time between retry attempts.
     * @param {number} [options.retryCount=5] - Number of retry attempts for fetching data.
     */
    constructor(searchTerms, options = {}) {
        this.searchTerms = searchTerms;
        this.maxResults = options.maxResults || null;
        this.language = options.language || null;
        this.region = options.region || null;
        this.sleepTime = options.sleepTime || 0.5;
        this.retryCount = options.retryCount || 5;

        this.BASE_URL = "https://youtube.com";
        this.RETRY_COUNT = this.retryCount;
        this.SLEEP_TIME = this.sleepTime;

        this._YT_INITIAL_DATA_MARKER = "ytInitialData";
        this._JSON_END_MARKER = "};";
        this._JSON_START_OFFSET = this._YT_INITIAL_DATA_MARKER.length + 3;

        this.videos = null;
    }

    /**
     * Perform a search on YouTube.
     * @returns {Promise<Array>} A promise that resolves to an array of video results.
     */
    async search() {
        try {
            this.videos = await this._search();
            return this.videos || [];
        } catch (error) {
            console.error(`Search failed: ${error}`);
            return [];
        }
    }

    /**
     * Internal method to execute the search.
     * @returns {Promise<Array>} A promise that resolves to an array of video results.
     * @private
     */
    async _search() {
        const url = this.searchTerms.startsWith(this.BASE_URL)
            ? this.searchTerms
            : `${this.BASE_URL}/results?search_query=${encodeURIComponent(this.searchTerms)}`;

        const response = await this._getResponseWithRetry(url);
        return await this._parseHtml(response);
    }

    /**
     * Fetch data from a URL with retry logic.
     * @param {string} url - The URL to fetch data from.
     * @returns {Promise<string>} A promise that resolves to the response text.
     * @throws Will throw an error if maximum retries are reached.
     * @private
     */
    async _getResponseWithRetry(url) {
        for (let attempt = 0; attempt < this.RETRY_COUNT; attempt++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const responseText = await response.text();
                if (responseText.includes(this._YT_INITIAL_DATA_MARKER)) {
                    return responseText;
                }
                await new Promise(resolve => setTimeout(resolve, this.SLEEP_TIME * 1000));
            } catch (e) {
                if (attempt < this.RETRY_COUNT - 1) {
                    console.warning(`Connection error: ${e}. Retrying... (${attempt + 1}/${this.RETRY_COUNT})`);
                    await new Promise(resolve => setTimeout(resolve, this.SLEEP_TIME * 1000));
                } else {
                    console.error(`Connection error: ${e}. Max retries reached.`);
                    throw e;
                }
            }
        }
        throw new Error(`Could not get ytInitialData from YouTube after ${this.RETRY_COUNT} retries`);
    }

    /**
     * Parse the HTML response to extract video data.
     * @param {string} response - The HTML response text.
     * @returns {Promise<Array>} A promise that resolves to an array of video results.
     * @private
     */
    async _parseHtml(response) {
        const results = [];

        try {
            const start_index = response.indexOf(this._YT_INITIAL_DATA_MARKER) + this._JSON_START_OFFSET;
            const end_index = response.indexOf(this._JSON_END_MARKER, start_index) + 1;
            const json_str = response.substring(start_index, end_index);
            const data = JSON.parse(json_str);

            const section_list = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

            if (!section_list) {
                return results;
            }

            for (const contents of section_list) {
                const item_section = contents?.itemSectionRenderer?.contents;

                if (!item_section) {
                    continue;
                }

                for (const video of item_section) {
                    const video_renderer = video?.videoRenderer;
                    if (!video_renderer) {
                        continue;
                    }
                    // console.log(video_renderer)

                    const url_suffix = video_renderer.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
                    const yt_url = url_suffix ? `${this.BASE_URL}${url_suffix}` : null;
                    // console.log(yt_url)

                    const video_data = {
                        id: video_renderer.videoId,
                        thumbnails: video_renderer.thumbnail?.thumbnails?.map(thumb => thumb.url) || [],
                        title: video_renderer.title?.runs?.[0]?.text || null,
                        long_desc: video_renderer.descriptionSnippet?.runs?.[0]?.text || null,
                        channel: video_renderer.longBylineText?.runs?.[0]?.text || null,
                        duration: video_renderer.lengthText?.simpleText || null,
                        views: video_renderer.viewCountText?.simpleText || null,
                        publish_time: video_renderer.publishedTimeText?.simpleText || null,
                        url_suffix: url_suffix,
                        yt_url: yt_url,
                    };
                    results.push(VideoResult.fromDict(video_data));
                }
            }

            return results;

        } catch (e) {
            console.error(`Error parsing HTML: ${e}`);
            return results;
        }
    }
}

export { YoutubeSearch, VideoResult };