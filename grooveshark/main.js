/********************* engine name **************************/

var gshark = {};
gshark.engine_name = 'Grooveshark';
gshark.initialized = false;
gshark.position = null;

/********************* Node modules *************************/

var GS = require('grooveshark-streaming');
var http = require('http');
var $ = require('jquery');
var path = require('path');
var i18n = require("i18n");
var _ = i18n.__;

/****************************/

// global var
var has_more = true;
var gs_win;
var old_count = 0;

gshark.init = function(gui,ht5) {
	gshark.gui = ht5;
    if ( gshark.initialized === false ) {
		$('#pagination').hide();
		$('#search').hide();
		$('#loading').show();
		$('#items_container').empty().css({"border": "1px solid black","position": "relative","left": "5px","top": "60px"}).hide();
		gshark.page = gui.Window.open('http://html5.grooveshark.com/#!/popular', {
				  "position":"center",
				  "width": 640,
				  "height": 800,
				  "show": true
				});
		gshark.page.on('loading', function(){
			console.log('gshark page loaded');
			gshark.page.hide();
			gs_win = gshark.page;
			gshark.search_type_changed();
			gshark.wait_songs();
			gshark.initialized = true;
		});
		gshark.page.on('close', function() {
		  this.hide();
		  this.close(true);
		});
	}
	// load engine
	loadEngine();
	
	// gshark
	$(ht5.document).off('click','.preload_gs');
	$(ht5.document).on('click','.preload_gs',function(){
		$(".mejs-overlay").show();
		$(".mejs-layer").show();
		$(".mejs-overlay-play").hide();
		$(".mejs-overlay-loading").show();
		var origins = $(this).attr("data");
		var song = JSON.parse(decodeURIComponent($(this).attr("data")));
		var id = song.id;
		$('#gshark_item_'+id).empty().append("<p> Loading song, please wait...</p>")
		$('.highlight').toggleClass('highlight','false');
		GS.Grooveshark.getStreamingUrl(id, function(err, streamUrl) {
			console.log("play: " + streamUrl)
			$("#cover").remove();
			$('#gshark_item_'+id).empty().append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="'+streamUrl+'" alt="360p"><span></span></a><a class="download_gs" href="#" data="'+origins+'" title="Download"><img src="images/down_arrow.png" width="16" height="16" />Download mp3</a></div>');
			var media= {};
			media.link = streamUrl;
			media.title = song.author +' - '+song.title;
			media.type='object.item.audioItem.musicTrack';
			gshark.gui.startPlay(media);
			$('#gshark_item_'+song.id).closest('.youtube_item').toggleClass('highlight','true');
			var p = $('.highlight').position().top;
			$('#left-component').scrollTop(p+12);
			if (ht5.engine.engine_name === 'Grooveshark') {
				$('#mep_0').append('<img id="cover" src="'+song.thumbnail+'" height="360" width="360" style="position: absolute;top: 50%;left: 50%;width: 360px;height: 360px;margin-top: -180px;margin-left: -180px;"/>');
			}
			// check if need to load more song
			totalItems = parseInt($('.list-header-play-now',gs_win.window.document.body).text().split('(')[1].replace(')',''));
			var count = parseInt($("#gshark_cont li.youtube_item").length);
			var list = $("#gshark_cont li.youtube_item");
			var hash = gs_win.window.document.location.hash;
			gshark.position = 0;
			if(hash.indexOf('#!/album/') !== -1 || hash.indexOf('#!/playlist/') !== -1  || hash.indexOf('#!/songs/') !== -1  || hash.indexOf('#!/popular') !== -1 || hash.indexOf('#!/search/songs/') !== -1 ) {
				$.each(list,function(index,item) {
					if($(item).hasClass('highlight')) {
						gshark.position = parseInt(index+1);
					}
					if(index+1 === list.length) {
						if(gshark.position === count && totalItems - gshark.position > 0) {
							console.log("NEED MORE SOUND... loading ! ")
							get_more_songs(0)
						}
					}
				});
			}
		});
	});
	
	$(ht5.document).off('click','#load_more_gshark');
	$(ht5.document).on('click','#load_more_gshark',function(e){
		e.preventDefault();
		get_more_songs(0);
	});
	
	$(ht5.document).off('click','.load_album');
	$(ht5.document).on('click','.load_album',function(e){
		e.preventDefault();
		var album = JSON.parse(decodeURIComponent($(this).attr("data")));
		gshark.ignoreSection = true;
		gshark.page.window.location.href = album.link;
	});
	
	$(ht5.document).off('click','.load_playlist');
	$(ht5.document).on('click','.load_playlist',function(e){
		e.preventDefault();
		var playlist = JSON.parse(decodeURIComponent($(this).attr("data")));
		gshark.ignoreSection = true;
		gshark.page.window.location.href = playlist.link;
	});
	
	$(ht5.document).off('click','.download_gs');
	$(ht5.document).on('click','.download_gs',function(e){
		e.preventDefault();
		var song = JSON.parse(decodeURIComponent($(this).attr("data")));
		GS.Grooveshark.getStreamingUrl(song.id, function(err, streamUrl) {
			var title = song.author +' - '+song.title+'.mp3';
			var id = song.id;
			console.log('downloading : '+title)
			gshark.gui.downloadFile(streamUrl,title,id,false);
			if ($('.tabActiveHeader').attr('id') !== 'tabHeader_4') {
				$("#tabHeader_4").click();
			}
		});
	});
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: gshark.gui.pluginsDir + 'grooveshark/locales',
    updateFiles: true
});

if ($.inArray(gshark.gui.settings.locale, localeList) >-1) {
	console.log('Loading gshark engine with locale' + gshark.gui.settings.locale);
	i18n.setLocale(gshark.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// engine config
gshark.menuEntries = ["searchTypes","categories"];
gshark.defaultSearchType = 'popular';
gshark.defaultMenus = ["searchTypes"];
gshark.searchTypes = JSON.parse('{"'+_("Songs")+'":"songs","'+_("Albums")+'":"albums","'+_("Playlists")+'":"playlists","'+_("Popular")+'":"popular"}');
//gshark.orderBy_filters = JSON.parse('{"'+_("Date")+'":"age","'+_("Title")+'":"song","'+_("Artist")+'":"artist"}');
gshark.has_related = false;
var totalItems = 0;
var currentSearch = "";
gshark.search_type_changed();
gshark.initialized = true;
gshark.searchType = 'popular';
gshark.searchInit = false;
gshark.albumsCount = 0;
gshark.playlistsCount = 0;
gshark.songsCount = 0;
gshark.ignoreSection = false;

// fix css for search menu
$('#search').css({"position":"fixed","z-index": "500","top": "74px","width": "46%","background": "white","overflow": "auto","height":"25px"});

}

gshark.search = function(query,options) {
	gshark.currentSearch = query;
	gshark.searchInit = false;
	gshark.ignoreSection = false;
	gshark.position = null;
	if ((query === '') && (options.searchType !== 'popular')) {
		$('#video_search_query').attr('placeholder','').focus();
		$('#loading').hide();
		$('#search').show();
		return;
	}
	if (options.searchType === 'popular') {
		gshark.page.window.location.href="http://html5.grooveshark.com/#!/popular";
	} else {
		gshark.page.window.location.href="http://html5.grooveshark.com/#!/search/"+query;
	}
}
			
gshark.load_more = function(more) {
	// hide load button of total results reached
	gs_win.window.scrollTo(0,gs_win.window.document.height - 50);
	if ($('.list-row-release-to-load',gs_win.window.document.body).length > 0) {
		if (more === true) {
			gshark.add_to_playlist(true);
		} else {
			gshark.add_to_playlist(false);
		}
	} else {
		$('#load_more_gshark').hide();
	}
}

gshark.add_to_playlist =  function(more) {
	if ((gshark.searchType === "songs") || (gshark.searchType === "popular") || (gshark.searchType !== "songs") && (gshark.searchType !== "popular") && (gshark.ignoreSection === true)) {
		gshark.get_songs(more);
		console.log("loading sounds");
	} else if ((gshark.searchType === "albums") && (gshark.ignoreSection === false)) {
		console.log("load albums")
		gshark.get_albums(more);
		console.log("loading albums");
	} else if ((gshark.searchType === "playlists") && (gshark.ignoreSection === false)) {
		gshark.get_playlists(more);
		console.log("loading playlists");
	}
}

gshark.search_type_changed = function() {
	gshark.searchType = $("#searchTypes_select option:selected").val();
	if (gshark.searchType === 'popular') {
		$("#search_results").empty().append("<p>"+_("Browsing %s section, search disabled use the load more button...",gshark.searchType)+"</p>");
		$('#video_search_query').prop('disabled', true);
	} else {
		$("#search_results").empty().append('<p>'+_("Grooveshark %s section",$("#searchTypes_select").val())+'</p>');
		$('#video_search_query').prop('disabled', false);
	}
}

gshark.get_songs = function(more,position) {
	if (more === false) {
		$('#items_container').empty().append('<ul id="gshark_cont" class="list" style="margin:0;"></ul><button style="width:100%;" id="load_more_gshark">'+_("Load more")+'</button>');
	}
	try {
		totalItems = $('.list-header-play-now',gs_win.window.document.body).text().split('(')[1].replace(')','');
		if ($("#searchTypes_select").val() === 'popular') {
			if ($('#search_results span').length === 0) {
				$('#search_results p').append($(this).text()+', <span>('+totalItems+' '+_("items available")+')</span>');
			}
		} else {
			$('#search_results p').empty().append(totalItems+' '+_("results found..."));
		}
	} catch(err) {}
	var list = $('li.song-row',gs_win.window.document.body);
	var count = list.length;
	var olist = list;
	console.log(olist)
	$.each(list,function(index,song){
		var itemjs = olist[index];
		var song = {};
		song.title= $(itemjs).find("h2").text();
		song.author = $(itemjs).find("h3").text().split("-")[0];
		song.id = $(itemjs).attr("data-song-id");
		song.thumbnail = $(itemjs).find("img").attr("src").replace("40_","500_");
		if ($('#gshark_item_'+song.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
						<div class="left"> \
							<img src="'+song.thumbnail+'" class="video_thumbnail"> \
						</div> \
						<div style="position: relative;overflow:auto;margin-left:5px;"> \
							<div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
								<span style="display:none;" class="video_length">'+song.duration+'</span> \
								<div> \
									<p> \
										<a class="preload_gs" data="'+encodeURIComponent(JSON.stringify(song))+'"> \
											<b>'+song.title+'</b> \
										</a> \
									</p> \
								</div> \
								<div> \
									<span> \
										<b>'+_("Artist: ")+'</b>'+song.author+' \
									</span> \
								</div> \
							</div> \
							<div id="gshark_item_'+song.id+'"> \
							</div> \
							<a class="open_in_browser" style="display:none;" alt="'+_("Open in grooveshark")+'" title="'+_("Open in grooveshark")+'" href="'+song.link+'"> \
								<img style="margin-top:8px;" src="images/export.png"> \
							</a> \
						</div> \
					</li>';
		$("#gshark_cont").append(html);
		if(index+1 === list.length) {
			setTimeout(function() {
				if(gshark.position !== null) {
					$($("#gshark_cont li.youtube_item")[gshark.position - 1]).addClass('highlight');
					var p = $('.highlight').position().top;
					$('#left-component').scrollTop(p+12);
				}
			},2000);
			totalItems = parseInt($('.list-header-play-now',gs_win.window.document.body).text().split('(')[1].replace(')',''));
			if (parseInt(totalItems) === parseInt($("#gshark_cont li.youtube_item").length)) {
				$('#load_more_gshark').hide();
			}
		}
	});
}

gshark.get_albums = function(more) {
	if (more === false) {
		$('#items_container').empty().append('<ul id="gshark_cont" class="list" style="margin:0;"></ul><button style="width:100%;" id="load_more_gshark">'+_("Load more")+'</button>');
	}
	try {
		totalItems = gshark.albumsCount;
		$('#search_results p').empty().append(totalItems+' '+_("albums found..."));
	} catch(err) {}
	var list = $('li.album-row',gs_win.window.document.body);
	var count = list.length;
	var olist = list;
	$.each(list,function(index){
		var itemjs = olist[index];
		var album = {};
		album.title= $(itemjs).find("h2").text();
		album.id = $(itemjs).attr("data-album-id");
		album.thumbnail = $(itemjs).find("img").attr("src").replace("40_","500_");
		album.link = 'http://html5.grooveshark.com'+$(itemjs).find("a").attr("href");
		if ($('#gshark_item_'+album.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
						<div class="left"> \
							<img src="'+album.thumbnail+'" class="video_thumbnail"> \
						</div> \
						<div style="position: relative;top: 10px; overflow:auto;margin-left:5px;"> \
							<div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
								<span style="display:none;" class="video_length">00:00:00</span> \
								<div> \
									<p> \
										<a class="load_album" data="'+encodeURIComponent(JSON.stringify(album))+'"> \
											<b>'+album.title+'</b> \
										</a> \
									</p> \
								</div> \
								<div> \
									<span style="display:none;"> \
										<b>'+_("Artist: ")+'</b> \
									</span> \
								</div> \
							</div> \
							<div id="gshark_item_'+album.id+'"> \
							</div> \
							<a class="open_in_browser" style="display:none;" alt="'+_("Open in grooveshark")+'" title="'+_("Open in grooveshark")+'" href="'+album.link+'"> \
								<img style="margin-top:8px;" src="images/export.png"> \
							</a> \
						</div> \
					</li>';
		$("#gshark_cont").append(html);
		if(index+1 === list.length) {
			totalItems = parseInt($('.list-header-play-now',gs_win.window.document.body).text().split('(')[1].replace(')',''));
			if (parseInt(totalItems) === parseInt($("#gshark_cont li.youtube_item").length)) {
				$('#load_more_gshark').hide();
			}
		}
	});
}

gshark.get_playlists = function(more) {
	if (more === false) {
		$('#items_container').empty().append('<ul id="gshark_cont" class="list" style="margin:0;"></ul><button style="width:100%;" id="load_more_gshark">'+_("Load more")+'</button>');
	}
	try {
		totalItems = gshark.playlistsCount;
		$('#search_results p').empty().append(totalItems+' '+_("playlists found..."));
	} catch(err) {}
	var list = $('li.playlist-row',gs_win.window.document.body);
	var count = list.length;
	var olist = list;
	$.each(list,function(index){
		var itemjs = olist[index];
		var playlist = {};
		playlist.title= $(itemjs).find("h2").text();
		playlist.id = $(itemjs).attr("data-playlist-id");
		playlist.thumbnail = "http://images.gs-cdn.net/static/albums/500_0";
		playlist.link = 'http://html5.grooveshark.com'+$(itemjs).find("a").attr("href");
		if ($('#gshark_item_'+playlist.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
						<div class="left"> \
							<img src="'+playlist.thumbnail+'" class="video_thumbnail"> \
						</div> \
						<div style="position: relative;top: 10px; overflow:auto;margin-left:5px;"> \
							<div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
								<span style="display:none;" class="video_length">00:00:00</span> \
								<div> \
									<p> \
										<a class="load_playlist" data="'+encodeURIComponent(JSON.stringify(playlist))+'"> \
											<b>'+playlist.title+'</b> \
										</a> \
									</p> \
								</div> \
								<div> \
									<span style="display:none;"> \
										<b>'+_("Artist: ")+'</b> \
									</span> \
								</div> \
							</div> \
							<div id="gshark_item_'+playlist.id+'"> \
							</div> \
							<a class="open_in_browser" style="display:none;" alt="'+_("Open in grooveshark")+'" title="'+_("Open in grooveshark")+'" href="'+playlist.link+'"> \
								<img style="margin-top:8px;" src="images/export.png"> \
							</a> \
						</div> \
					</li>';
		$("#gshark_cont").append(html);
		if(index+1 === list.length) {
			totalItems = parseInt($('.list-header-play-now',gs_win.window.document.body).text().split('(')[1].replace(')',''));
			if (parseInt(totalItems) === parseInt($("#gshark_cont li.youtube_item").length)) {
				$('#load_more_gshark').hide();
			}
		}
	});
}

gshark.wait_songs = function() {
	console.log("waiting for page loading : "+gshark.searchType +", search init : "+gshark.searchInit);
	if ((gshark.searchType === 'popular') || (gshark.ignoreSection === true)) {
		var count = $('li.song-row',gs_win.window.document.body).length;
		if (parseInt(count) === 0) {
			setTimeout(function(){gshark.wait_songs()},1000);
		} else {
			$('#search').css({"position":"fixed","z-index": "500","top": "74px","width": "46%","background": "white","overflow": "auto","height":"25px"}).show();
			$('#loading').hide();
			$('#search').show();
			$('#items_container').show();
			gshark.get_songs(false);
			//get_more_songs(0);
		}
	} else {
		if (gshark.searchInit === false) {
			// analyse sections songs/albums/playlists
			var doc = gs_win.window.document.body;
			try {
				var songres = $("#search-results-songs",doc).length;
				var albres = $("#search-results-albums",doc).length;
				var playres =  $("#search-results-playlists",doc).length;
				if ((songres !== 0) && (albres !== 0) && (playres !== 0)) {
					// songs
					if ($("#search-results-songs p.search-results-notfound",doc).length === 1) {
						gshark.songsCount = 0;
					} else {
						gshark.songsCount = $($('li.list-row-more',doc)[0]).text().match(/\d+/)[0]
					}
					// albums
					if ($("#search-results-albums p.search-results-notfound",doc).length === 1) {
						gshark.albumsCount = 0;
					} else {
						gshark.albumsCount = $($('li.list-row-more',doc)[1]).text().match(/\d+/)[0]
					}
					// playlists
					if ($("#search-results-playlists p.search-results-notfound",doc).length === 1) {
						gshark.playlistsCount = 0;
					} else {
						gshark.playlistsCount = $($('li.list-row-more',doc)[2]).text().match(/\d+/)[0]
					}
					console.log("page loaded "+gshark);
					// once loaded go to selected section
					if (gshark.searchType === 'songs') {
						if (gshark.songsCount === 0) {
							$("#search_results").empty().append('<p>'+_("No %s found...",gshark.searchType)+'</p>');
							$('#loading').hide();
							$('#search').show();
							return;
						} else {
							gshark.page.window.location.href="http://html5.grooveshark.com/#!/search/songs/"+gshark.currentSearch;
						}
					} else if (gshark.searchType === 'albums') {
						if (gshark.albumsCount === 0) {
							$("#search_results").empty().append('<p>'+_("No %s found...",gshark.searchType)+'</p>');
							$('#loading').hide();
							$('#search').show();
							return;
						} else {
							gshark.page.window.location.href="http://html5.grooveshark.com/#!/search/albums/"+gshark.currentSearch;
						}
					} else if (gshark.searchType === 'playlists') {
						if (gshark.playlistsCount === 0) {
							$("#search_results").empty().append('<p>'+_("No %s found...",gshark.searchType)+'</p>');
							$('#loading').hide();
							$('#search').show();
							return;
						} else {
							gshark.page.window.location.href="http://html5.grooveshark.com/#!/search/playlists/"+gshark.currentSearch;
						}
					}
					gshark.searchInit = true;
				} else {
					setTimeout(function(){gshark.wait_songs()},1000);
				}
			} catch(err) {
				console.log("wait songs error "+err);
				$("#search_results").empty().append("<p>"+_('No results found...')+"</p>");
				$('#loading').hide();
				$('#search').show();
				return;
			}
		} else {
			// gshark page loaded and initialized
			var type ='';
			if (gshark.searchType === 'songs') {
				type = 'song';
			} else if (gshark.searchType === 'albums') {
				type = 'album';
			} else if (gshark.searchType === 'playlists') {
				type = 'playlist';
			}
			var count = $('li.'+type+'-row',gs_win.window.document.body).length;
			if (count === 0) {
				setTimeout(function(){gshark.wait_songs()},1000);
			} else {
				$('#loading').hide();
				$('#search').show();
				$('#items_container').show();
				if (type === 'song') {
					gshark.get_songs(false);
				} else if (type === 'album') {
					gshark.get_albums(false);
				} else if (type === 'playlist') {
					gshark.get_playlists(false);
				}
				//get_more_songs(0);
			}
		}
	}
}

function get_more_songs(count) {
	if (count === 2) {
		return;
	}
	setTimeout(function(){
		$("#load_more_gshark",gs_win.window.document.body).click();
		gshark.load_more(true);
		get_more_songs(count+1);
	},1000);
}

module.exports = gshark;
