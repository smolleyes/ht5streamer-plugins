/********************* engine name **************************/

var megaFiles = {};
megaFiles.engine_name = 'Mega-files';

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
megaFiles.init = function(gui,ht5) {
    megaFiles.gui = ht5;
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
		stream.title = video.title;
    $.get(video.link,function (response) {
      var link = $('a.extra-file',response).attr('href');
      stream.link = 'http://'+megaFiles.gui.ipaddress+':8888/?file='+encodeURIComponent(link);
      megaFiles.gui.startPlay(stream);
    });
	});
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: megaFiles.gui.pluginsDir + 'mega-files/locales',
    updateFiles: false
});

if ($.inArray(megaFiles.gui.settings.locale, localeList) >-1) {
	console.log('Loading megaFiles engine with locale' + megaFiles.gui.settings.locale);
	i18n.setLocale(megaFiles.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

/********************* engine config *************************
**************************************************************/

// menus needed by the module and menu(s) loaded by default
megaFiles.menuEntries = ["searchTypes"];
megaFiles.defaultMenus = ["searchTypes"];
// searchTypes menus and default entry
megaFiles.searchTypes = {"Videos":"videos"};
megaFiles.defaultSearchType = 'videos';
// orderBy filters and default entry
//megaFiles.orderBy_filters = JSON.parse('{"'+_("Relevant")+'":"relevant","'+_("Newest")+'":"newest","'+_("Most viewed")+'":"most_played","'+_("Most rated")+'":"most_liked"}');
// others params
megaFiles.has_related = false;

}

// search videos
megaFiles.search = function (query, options, gui){
	try {
		megaFiles.gui = gui;
		videos_responses = new Array();
		var page = options.currentPage;
		searchType = options.searchType;
		query = query.replace(' ','-');
		var datas;
		var req=http.get('http://megafiles.me/s/'+query+'/'+page);
		req.on('response',function(response) { 
			var data = new Array(); 
			response.on("data", function(chunk) {
				data.push(chunk);
			});
			response.on('end',function(){
				try {
					var datas = data.join('');
				} catch(err) {
					console.log(err);
					return;
				}
        var videos = [];
        var pageResults = 0;
        try {
			var totalResults = $('.resultsNumber',datas).text().match(/(.*?)of (.*?) /)[2];
		} catch(err) {
			$('#loading').hide();
			$("#loading p").empty().append(_("Loading videos..."));
			$("#search").show();
			$('#search_results p').empty().append('No results found... !');
			return;
		}
        var list = $('.box',datas);
        var length = list.length - 1;
        $.each(list,function(index,res){
            var title = $($('.boxTitle',this)[0]).text();
            var link;
            var size;
            var date;
            var views;
            try {
                link = $($('.boxTitle',this)[0]).attr("href");
                size = $($('.greenRes',this)[2]).text().trim();
                date = $($('.greenRes',this)[3]).text().trim();
                videos[pageResults] = {};
                videos[pageResults]['title'] = title;
                videos[pageResults]['link'] = link;
                videos[pageResults]['size'] = size;
                videos[pageResults]['thumbnail'] = 'images/movie.png';
                videos[pageResults]['date'] = date;
                pageResults += 1;
            } catch(err) {
                console.log(err);
                if (index === length) {
					return print_videos(totalResults,videos);
				} else {
					return true;
				}
            }
            if (index === length) {
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

megaFiles.search_type_changed = function() {
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
	// init pagination if needed
	if (browser_mode === true) {
		megaFiles.gui.init_pagination(0,40,true,true);
  } else {
		megaFiles.gui.init_pagination(total-1,40,false,false,Math.ceil(total/40).toFixed());
	}
    $("#pagination").show();
    
  // load videos in the playlist
	$('#items_container').empty().append('<ul id="megaFiles_cont" class="list" style="margin:0;"></ul>').show();
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
									<b>'+_("Posted on: ")+'</b>'+video.date+' \
								</span> \
							</div> \
						</div> \
						<div id="megaFiles_item_'+video.videoId+'"> \
						</div> \
						<a class="open_in_browser" alt="'+_("Open in megaFiles")+'" title="'+_("Open in megaFiles")+'" href="'+video.link+'"> \
							<img style="margin-top:8px;" src="images/export.png"> \
						</a> \
					</li>';
		$("#megaFiles_cont").append(html);
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
		$('#megaFiles_item_'+vid).append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="'+vlink+'" alt="'+resolution+'"><img src="'+img+'" class="resolution_img" /><span>'+ resolution+'</span></a><a href="'+vlink+'" alt="'+title+'.'+container+'::'+vid+'" title="'+_("Download")+'" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />'+resolution+'</a></div>');
		if (i+1 === resolutions_string.length) {
			$('#megaFiles_item_'+vid).closest('li').find("a.preload").removeClass("preload").addClass("start_video");
			megaFiles.gui.startVideo('megaFiles_item_'+vid);
		}
	}
}

module.exports = megaFiles;
