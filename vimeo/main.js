/********************* engine name **************************/

var vimeo = {};
vimeo.engine_name = 'Vimeo';

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
vimeo.init = function(gui,ht5) {
    vimeo.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).on('click','.preload',function(e){
		e.preventDefault();
		$(".mejs-overlay").show();
		$(".mejs-layer").show();
		$(".mejs-overlay-play").hide();
		$(".mejs-overlay-loading").show();
		var video = JSON.parse(decodeURIComponent($(this).attr("data")));
		var videoLink = video.embedCode;
		var vid = video.videoId;
		if ($('#vimeo_item_'+vid+' a').length === 0) {
			$.get(videoLink+'/config',function(res) {
				if ((res === undefined) || (res.request.files.h264 === undefined)) {
					$("#vimeo_item_"+video.videoId).append('<p style="color:red;">Unable to fetch videos links or no mp4 streams found (flv/vp6 found)...</p>');
					vimeo.play_next();
					$("#vimeo_item_"+video.videoId).closest('li').next().find("a.start_video").click();
				} else {
					var resolutions = {};
					var arr = res.request.files.h264;
					var c=0;
					$.each(arr,function(i,resol){
						var resolution = parseInt(arr[i].height);
						if (resolution === 1080) {
							resolution = '1080p';
						} else if (resolution === 720){
							resolution = '720p';
						} else if (resolution === 480){
							resolution = '480p';
						} else if (resolution === 360){
							resolution = '360p';
						} else if ((resolution > 360) && (resolution < 480)){
							resolution = '360p';
						} else if ((resolution > 480) && (resolution < 720)){
							resolution = '480p';
						} else if ((resolution > 720) && (resolution < 1080)){
							resolution = '720p';
						} else if (resolution < 360){
							resolution = '360p';
						}
						resolutions[resolution] = [];
						resolutions[resolution]['link'] = arr[i].url;
						resolutions[resolution]['container'] = 'mp4';
						c+=1;
						if (c === Object.keys(arr).length) {
							load_resolutions(resolutions,vid,video.title);
						}
						
					});
				}
			});
		}
	});
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: vimeo.gui.pluginsDir + 'vimeo/locales',
    updateFiles: false
});

if ($.inArray(vimeo.gui.settings.locale, localeList) >-1) {
	console.log('Loading vimeo engine with locale' + vimeo.gui.settings.locale);
	i18n.setLocale(vimeo.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

/********************* engine config *************************
**************************************************************/

// menus needed by the module and menu(s) loaded by default
vimeo.menuEntries = ["searchTypes","orderBy"];
vimeo.defaultMenus = ["searchTypes","orderBy"];
// searchTypes menus and default entry
vimeo.searchTypes = {"Videos":"videos"};
vimeo.defaultSearchType = 'videos';
// orderBy filters and default entry
vimeo.orderBy_filters = JSON.parse('{"'+_("Relevant")+'":"relevant","'+_("Newest")+'":"newest","'+_("Most viewed")+'":"most_played","'+_("Most rated")+'":"most_liked"}');
// others params
vimeo.has_related = false;

}

// search videos
vimeo.search = function (query, options, gui){
	try {
		vimeo.gui = gui;
		videos_responses = new Array();
		var page = options.currentPage;
		searchType = options.searchType;
		var req=http.get('http://api.camideo.com/?key=b833a406fb217e3a37bec7e29145e498&q='+query+'&source=vimeo&page='+page+'&response=json&sort='+options.orderBy+'&per_page=10&summary_response=1&full_response=1');
		console.log(req);
		req.on('response',function(response) { 
			var data = new Array(); 
			response.on("data", function(chunk) {
				data.push(chunk);
			});
			response.on('end',function(){
				try {
					var datas = JSON.parse(data.join('')).Camideo;
				} catch(err) {
					console.log(err);
					return;
				}
				print_videos(datas.totalResults,datas.videos);
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

vimeo.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	$("#categories_select").hide();
	$("#dateTypes_select").hide();
	$("#searchFilters_select").hide();
	$("#orderBy_select").show();
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
		vimeo.gui.init_pagination(0,10,true,true);
    } else {
		vimeo.gui.init_pagination(total,10,false,false);
	}
    $("#pagination").show();
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="vimeo_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos,function(index,video) {
		var html = '<li class="youtube_item"> \
						<div class="left"> \
							<img src="'+video.thumbnail+'" class="video_thumbnail"> \
						</div> \
						<div class="item_infos"> \
							<span class="video_length">'+video.duration+'</span> \
							<div> \
								<p> \
									<a class="preload" data="'+encodeURIComponent(JSON.stringify(video))+'"> \
										<b>'+video.title+'</b> \
									</a> \
								</p> \
							<div> \
								<span> \
									<b>'+_("Posted by: ")+'</b>'+video.author+'</span> \
								<span style="margin-left:10px;"> \
									<b>'+_("Views: ")+'</b>'+video.views+' \
								</span> \
							</div> \
						</div> \
						<div id="vimeo_item_'+video.videoId+'"> \
						</div> \
						<a class="open_in_browser" alt="'+_("Open in vimeo")+'" title="'+_("Open in vimeo")+'" href="'+video.link+'"> \
							<img style="margin-top:8px;" src="images/export.png"> \
						</a> \
					</li>';
		$("#vimeo_cont").append(html);
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
		$('#vimeo_item_'+vid).append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="'+vlink+'" alt="'+resolution+'"><img src="'+img+'" class="resolution_img" /><span>'+ resolution+'</span></a><a href="'+vlink+'" alt="'+title+'.'+container+'::'+vid+'" title="'+_("Download")+'" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />'+resolution+'</a></div>');
		if (i+1 === resolutions_string.length) {
			$('#vimeo_item_'+vid).closest('li').find("a.preload").removeClass("preload").addClass("start_video");
			vimeo.gui.startVideo('vimeo_item_'+vid);
		}
	}
}

module.exports = vimeo;
