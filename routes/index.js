const express = require('express');
const router = express.Router();

const fetch = require('node-fetch');

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const isWeekday = date => 0 < date.getDay() < 6;

const getWeekdays = (count=100) => {
    const output = [];
    const cursor = new Date().setHours(0,0,0,0);

    while (count > 0) {
        if (isWeekday(cursor)) {
            output.push(cursor);
            cursor.setDate(cursor.getDate() - 1);
            count -= count;
        } 
    }

    return output;
};

const getBOD = (date = new Date()) => {
    date = new Date(date.valueOf());
    date.setHours(0,0,0,0);
    return date;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

const AV_API_KEY = 'I3P8JZPN7WMUEHYG';
const API_KEY = 'AIzaSyD6al5UtVriubJd0OGwIufepKiBVvbK_3g'; 
const stock = 'TSLA';

const fetchTopVideos = (q, date = getBOD()) => {
    console.log(date);
    const publishedAfter = date.toISOString();
    const publishedBefore = date.addDays(1).toISOString();
    const url = new URL('https://youtube.googleapis.com/youtube/v3/search');
    const params = new URLSearchParams({
        part: 'snippet',
        maxResults: 50,
        order: 'ViewCount',
        publishedAfter,
        publishedBefore,
        q,
        type: 'video',
        key: API_KEY,
    });
    url.search = params;

    return fetch(url)
        .then(yt_resp => yt_resp.json())
        .then(data => data.items);
};

const fetchVideoStats = (id) => {
    const url = new URL('https://youtube.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({
        key: API_KEY,
        part: 'snippet,statistics',
        id,
        // id: 'IeoufFGfqS4,Xtv_i_98Mec,7AHkTxsLAEw',
    });

    return fetch(url)
        .then(yt_resp => yt_resp.json());
};

const top50VideosStats = (q) => {
    return fetchTopVideos(q)
        .then(videos => videos.map(video => video.id.videoId))
        .then(ids => fetchVideoStats(ids))
        .then(videos => videos.items.reduce((accum, current) => {
            Object.keys(accum).forEach((key) => {
                accum[key] += parseInt(current.statistics[key]);
            });
            return accum;
        }, {
            viewCount: 0,
            likeCount: 0,
            dislikeCount: 0,
            favoriteCount: 0,
            commentCount: 0,
        }));
};

router.get('/api/search', function(req, res, next) {
    fetchTopVideos(stock)
        .then(videos => res.json(videos));
});

router.get('/api/videos', function(req, res, next) {
    fetchTopVideos(stock)
        .then(videos => videos.map(video => video.id.videoId))
        .then(ids => fetchVideoStats(ids))
        .then(videos => res.json(videos));
});

router.get('/api/stats', function(req, res, next) {
    top50VideosStats(stock)
        .then(stats => res.json(stats));
});

const fetchStockData = (symbol) => {
    const url = new URL('https://www.alphavantage.co/query');
    url.search = new URLSearchParams({
        function: 'TIME_SERIES_DAILY',
        symbol,
        apikey: AV_API_KEY,
    });

    return fetch(url)
        .then(resp => resp.json())
        .then((data) => {
            const timeSeriesData = data['Time Series (Daily)'];
            // array of array
            const output = [['date', 'close', 'volume']];
                Object.entries(timeSeriesData).forEach(([key, value]) => {
                    output.push([key, parseInt(value['4. close']), parseInt(value['5. volume'])]);
                });
            return output;
        });
}

router.get('/api/av', function(req, res, next) {
    fetchStockData(stock)
        .then(data => res.json(data));
});

module.exports = router;
