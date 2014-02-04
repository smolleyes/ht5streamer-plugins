/********************* engine name **************************/

var mega = {};
mega.engine_name = 'Mega';

/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var i18n = require("i18n");
var _ = i18n.__;

/****************************/
// module global vars
var videos_responses = new Array();
var has_more = true;
var searchType = 'videos';
var init = false;
var browser_mode= false;

// init module
mega.init = function(gui,ht5) {
    mega.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).on('click','.preload',function(e){
		e.preventDefault();
		$(".mejs-overlay").show();
		$(".mejs-layer").show();
		$(".mejs-overlay-play").hide();
		$(".mejs-overlay-loading").show();
		var video = JSON.parse(decodeURIComponent($(this).attr("data")));
		var stream = {};
    stream.link = 'http://'+mega.gui.ipaddress+':8888/?file='+encodeURIComponent(video.link);
    stream.title = video.title;
    mega.gui.startPlay(stream);
	});
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: path.dirname(process.execPath) + '/plugins/mega/locales',
    updateFiles: false
});

if ($.inArray(mega.gui.settings.locale, localeList) >-1) {
	console.log('Loading mega engine with locale' + mega.gui.settings.locale);
	i18n.setLocale(mega.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

/********************* engine config *************************
**************************************************************/

// menus needed by the module and menu(s) loaded by default
mega.menuEntries = ["searchTypes"];
mega.defaultMenus = ["searchTypes"];
// searchTypes menus and default entry
mega.searchTypes = {"Videos":"videos"};
mega.defaultSearchType = 'videos';
// orderBy filters and default entry
//mega.orderBy_filters = JSON.parse('{"'+_("Relevant")+'":"relevant","'+_("Newest")+'":"newest","'+_("Most viewed")+'":"most_played","'+_("Most rated")+'":"most_liked"}');
// others params
mega.has_related = false;

}

// search videos
mega.search = function (query, options, gui){
	try {
		mega.gui = gui;
		videos_responses = new Array();
		var page = options.currentPage;
		searchType = options.searchType;
    query = query.replace(' ','+');
		var req=http.get('http://mega-search.me/search?k='+query);
		req.on('response',function(response) { 
			var data = new Array(); 
			response.on("data", function(chunk) {
				data.push(chunk);
			});
			response.on('end',function(){
				try {
					var datas = data.join('').replace(/<!--/g,'').replace(/-->/g,'');
				} catch(err) {
					console.log(err);
					return;
				}
        var videos = [];
        var totalResults = 0;
        var list = $('.link',datas);
        $.each(list,function(index,res){ 
            var title = $($('.title',this)[0]).text();
            var link;
            var size;
            var date;
            var views;
            try {
                link = $($('.streaming',this)[0]).attr("onclick").match(/(.*?)'(.*?)'/)[2].replace('http://mega-stream.me?h=','https://mega.co.nz/#!').replace('&k=','!');
                size = $($('.size',this)[0]).text().trim();
                views = $($('.hits',this)[0]).text().trim();
                videos[totalResults] = {};
                videos[totalResults]['title'] = title;
                videos[totalResults]['link'] = link;
                videos[totalResults]['size'] = size;
                videos[totalResults]['thumbnail'] = 'images/movie.png';
                videos[totalResults]['views'] = views;
                totalResults += 1;
            } catch(err) {
                console.log(err);
            }
            if (index+1 === list.length) {
                print_videos(totalResults,videos);
            }
        });
			});
		});
		req.on('error', function(e) {
			console.log("Got error: " + e.message);
		});
		req.end();
	} catch(err) {
		console.log(err);
	}
}

mega.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	$("#categories_select").hide();
	$("#dateTypes_select").hide();
	$("#searchFilters_select").hide();
	$("#orderBy_select").hide();
	$('#video_search_query').prop('disabled', false);
	if (init === false) {
		init=true;
	}
}

function print_videos(total,videos) {
	$('#loading').hide();
	$("#loading p").empty().append(_("Loading videos..."));
	$("#search").show();
  $("#pagination").hide();
    
  // load videos in the playlist
	$('#items_container').empty().append('<ul id="mega_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos,function(index,video) {
		var html = '<li class="youtube_item"> \
						<div class="left"> \
							<img src="'+video.thumbnail+'" class="video_thumbnail"> \
						</div> \
						<div class="item_infos"> \
							<span class="video_length"></span> \
							<div> \
								<p> \
									<a class="preload" data="'+encodeURIComponent(JSON.stringify(video))+'"> \
										<b>'+video.title+'</b> \
									</a> \
								</p> \
							<div> \
								<span> \
									<b>'+_("Size: ")+'</b>'+video.size+'</span> \
								<span style="margin-left:10px;"> \
									<b>'+_("Views: ")+'</b>'+video.views+' \
								</span> \
							</div> \
						</div> \
						<div id="mega_item_'+video.videoId+'"> \
						</div> \
						<a class="open_in_browser" alt="'+_("Open in mega")+'" title="'+_("Open in mega")+'" href="'+video.link+'"> \
							<img style="margin-top:8px;" src="images/export.png"> \
						</a> \
					</li>';
		$("#mega_cont").append(html);
	});
}

function load_resolutions(datas,vid,title) {
	var resolutions_string = ['1080p','720p','480p','360p'];
	var resolutions = datas;
	for(var i=0; i<resolutions_string.length; i++) {
		try {
			var resolution = resolutions_string[i];
			var vlink = resolutions[resolution]['link'];
			if (vlink === 'null') { continue; }
			var container = resolutions[resolution]['container'];
		} catch(err) {
			continue;
		}
		var img='';
		if (resolution == "720p" || resolution == "1080p") {
			img='images/hd.png';
		} else {
			img='images/sd.png';
		}
		$('#mega_item_'+vid).append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="'+vlink+'" alt="'+resolution+'"><img src="'+img+'" class="resolution_img" /><span>'+ resolution+'</span></a><a href="'+vlink+'" alt="'+title+'.'+container+'::'+vid+'" title="'+_("Download")+'" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />'+resolution+'</a></div>');
		if (i+1 === resolutions_string.length) {
			$('#mega_item_'+vid).closest('li').find("a.preload").removeClass("preload").addClass("start_video");
			mega.gui.startVideo('mega_item_'+vid);
		}
	}
}

module.exports = mega;
