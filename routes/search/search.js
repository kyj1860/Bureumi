const express = require('express');
const router = express.Router();
const path = require('path');
const connection = require('../connection');
const haversine = require('haversine');
const logger = require('../../config/logger');

router.get('/', function (req, res) {
    var flag = req.query.cag;

    var id = req.user;
    if (req.session.user_info == undefined) res.redirect('/error/info');
    else {
        var data = [req.session.user_info.user_id]
        var sql = 'select * from request where not writer_id = ? and not exists(select * from matching where request.request_code = matching.request_code) order by length(request_code) desc';

        connection.query(sql, data, function (err, result) {
            if (err) {
                console.error(err);
                logger.error('경로 : ' + __dirname + '  message: ' + err);
                res.redirect('/error/connect');
            }
            const start = {
                latitude: req.session.user_info.addressLat,
                longitude: req.session.user_info.addressLon
            }

            var sorted_by_gps_result = [];
            var end = [];
            for (var n = 0; n < result.length; n++) {
                end[n] = {
                    latitude: result[n].latitude,
                    longitude: result[n].longitude
                }
                result[n].distance = haversine(start, end[n])
                sorted_by_gps_result[n] = result[n]
            }
            for (var i = 0; i < sorted_by_gps_result.length - 1; i++) {
                for (var j = 1; j < sorted_by_gps_result.length - i; j++) {
                    if (sorted_by_gps_result[j].distance < sorted_by_gps_result[j - 1].distance) {
                        var temp = sorted_by_gps_result[j - 1];
                        sorted_by_gps_result[j - 1] = sorted_by_gps_result[j];
                        sorted_by_gps_result[j] = temp;
                    }
                }
            }
            result.sort(function (a, b) {
                if (a.request_code < b.request_code) return 1;
                else if (a.request_code > b.request_code) return -1;
                else return 0;
            })
            if (flag == undefined || flag == 0) req.session.search_main = sorted_by_gps_result;
            else req.session.search_main = result;

            res.redirect('/search/1');
        });
    }
});

router.get('/:page', function (req, res) {
    if (req.session.user_info == undefined) res.redirect('/error/info');
    else {
        var page = req.params.page
        var id = req.session.user_info.user_id;
        var total_page = Math.ceil(req.session.search_main.length / 5)


        res.render('search', {
            search: req.session.search_main,
            total_page: total_page,
            page: page,
            length: req.session.search_main.length - 1
        });
    }
});


module.exports = router;