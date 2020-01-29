let currentRangeIndex = 0;
const oneDayInMilliseconds = 24 * 3600 * 1000;
// const originalColor = {r: 82, g: 151, b: 186};
const originalColor = {r: 82, g: 186, b: 151};

function nextGenerationLog(...params) {
    const now = new Date();
    const paddedSeconds = now.getSeconds().toString().padStart(2, '0');
    const paddedMilliseconds = now.getMilliseconds().toString().padStart(3, '0');
    console.log(`[Medium Next Gen Stats - ${paddedSeconds}:${paddedMilliseconds}] ${params}`)
}

function prettifyNumbers(number) {
    const unity = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
    const tier = (Math.log10(number) / 3) | 0;
    if (tier === 0) {
        return number;
    }
    const suffix = unity[tier];
    const scale = Math.pow(10, tier * 3);
    const scaled = number / scale;
    return scaled.toFixed(2) + suffix;
}

async function getPostsFromUser() {
    const posts = await request(`https://medium.com/me/stats?format=json&limit=100000`);
    return posts.value
        .map(post => {
                return {
                    ...post,
                    id: post.postId
                }
            }
        );
}

async function rangeButtonClicked(listItems, clickedItemIndex) {
    if (chartOptions.loaded) {
        chartOptions.loaded = false;
        currentRangeIndex = clickedItemIndex;
        const selectedRange = ranges[clickedItemIndex];
        nextGenerationLog(`Generating ${selectedRange.label} chart`);
        listItems
            .forEach((item, index) => index === clickedItemIndex ? item.classList.add('is-active') : item.classList.remove('is-active'));
        statsOptions.rangeMethod = selectedRange.rangeMethod;
        statsOptions.label = selectedRange.label;
        statsOptions.firstDayOfRange = new Date(statsOptions.lastDayOfRange.getTime() -
            (selectedRange.daysOfRange * oneDayInMilliseconds));

        updateChartPageLabels();
        await generateChart();
    }
}

function getPostsData() {
    nextGenerationLog(`Loading data of ${postsSummary.length} posts`);
    return Promise
        .all(postsSummary.map((post) => loadPostStats(post)))
        .then(postsInformation => postsInformation
            .reduce((acc, item) => acc.concat(item), [])
        );
}

function loadPostStats(post) {
    // delete post.views;
    // delete post.claps;
    // delete post.internalReferrerViews;
    // delete post.createdAt;
    // delete post.reads;
    // delete post.upvotes;
    // post.publicationDate = new Date(post.firstPublishedAt);
    return getPostStats(post.id)
        .then(postStats => postStats
            .map(postStat => {
                const fullStats = {...postStat, id: post.id, title: post.title};
                delete fullStats.postId;
                return fullStats
            }));
}

function getPostStats(postId) {
    return request(`https://medium.com/stats/${postId}/0/${Date.now()}`)
        .then(data => data && data.value || []);
}


function request(url) {
    return fetch(url, {credentials: "same-origin", headers: {accept: 'application/json'}})
        .then(res => {
            if (res.status !== 200) {
                const message = `Fail to fetch data: (${res.status}) - ${res.statusText}`;
                console.log(message);
                throw message;
            }
            return res.text();
        })
        .then(text => JSON.parse(text.slice(16)).payload)
}

const getViewOfData = (data) => data.views;
const getClapsOfData = (data) => data.claps;

const now = new Date();
const tomorrow = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + oneDayInMilliseconds);
const initiallySelectedRange = ranges[currentRangeIndex];
const statsOptions = {
    firstDayOfRange: new Date(tomorrow.getTime() - (initiallySelectedRange.daysOfRange * oneDayInMilliseconds)),
    lastDayOfRange: tomorrow,
    relevantDatum: getViewOfData,
    relevantDatumLabel: 'views',
    rangeMethod: initiallySelectedRange.rangeMethod,
    label: initiallySelectedRange.label
};

nextGenerationLog('Started');
let postsData = undefined;
let postsSummary = undefined;

renewOldFashionPage()
    .then(() => getPostsFromUser())
    .then(data => {
        postsSummary = data;
    })
    .then(() => getPostsData()
        .then(data => {
            postsData = data;
        })
        .then(() => generateChart())
        .then(() => nextGenerationLog('Done')))
    .catch(() => window.location.replace("https://medium.com/me/stats/"));
