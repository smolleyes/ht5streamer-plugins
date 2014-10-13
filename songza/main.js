/********************* engine name **************************/

var songza = {};
songza.engine_name = 'Songza';
songza.defaultSearchType = 'populars';

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
var init = false;
var browser_mode= false;
songza.current_station_id = '';

// init module
songza.init = function(gui,ht5) {
    songza.gui = ht5;
    loadEngine();
    $("#loading p").empty().append(_("Loading stations..."));
    //play videos
    $(ht5.document).off('click','.load_genre');
    $(ht5.document).on('click','.load_genre',function(e){
		e.preventDefault();
		$('#loading').show();
		$("#loading p").empty().append(_("Loading stations..."));
		$("#search").hide();
		$('#items_container').empty().hide();
		var station = JSON.parse(decodeURIComponent($(this).attr("data")));
		songza.load_genre_stations(station);
	});
	
	$(ht5.document).off('click','.load_station');
	$(ht5.document).on('click','.load_station',function(e){
		e.preventDefault();
		$('#loading').show();
		$("#loading p").empty().append(_("Loading stations..."));
		$("#search").hide();
		$('#items_container').empty().append('<ul id="songza_cont" class="list" style="margin:0;"></ul>').show();
		var station = JSON.parse(decodeURIComponent($(this).attr("data")));
		$("#search_results p").empty().append(_("Playing %s station <br /> %s sounds in this playlist",station.name,station.song_count))
		songza.current_station_id = station.id;
		songza.current_station_songsCount = station.song_count;
		songza.load_next(station.id);
	});
	
	$(ht5.document).off('click','.load_song');
	$(ht5.document).on('click','.load_song',function(e){
		e.preventDefault();
		$('.highlight').toggleClass('highlight','false');
		var song = JSON.parse(decodeURIComponent($(this).attr("data")));
		var media= {};
		media.link = song.listen_url;
		media.type='object.item.audioItem.musicTrack';
		song.title = song.song.artist.name +' - '+ song.song.title;
		songza.gui.startPlay(media);
		$('#songza_item_'+song.song.id).closest('.youtube_item').toggleClass('highlight','true');
		var p = $('#songza_item_'+song.song.id).parent().parent().position().top;
		$('#left-component').scrollTop(p+11);
	});
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: songza.gui.pluginsDir + 'songza/locales',
    updateFiles: true
});

if ($.inArray(songza.gui.settings.locale, localeList) >-1) {
	console.log('Loading songza engine with locale ' + songza.gui.settings.locale);
	i18n.setLocale(songza.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

/********************* engine config *************************
**************************************************************/

// menus needed by the module and menu(s) loaded by default
songza.menuEntries = ["searchTypes","searchFilters"];
songza.defaultMenus = ["searchTypes","searchFilters"];
// searchTypes menus and default entry
songza.searchTypes = JSON.parse('{"'+_("Populars")+'":"populars","'+_("Search")+'":"search","'+_("Genres")+'":"genres","'+_("Activities")+'":"activities","'+_("Moods")+'":"moods","'+_("Decades")+'":"decades","'+_("Culture")+'":"culture"}');
songza.searchFilters = JSON.parse('{"'+_("Trending")+'":"trending","'+_("All time")+'":"all-time"}');
songza.defaultSearchFilter = "trending";
songza.defaultSearchType = 'populars';
// others params
songza.has_related = false;

}

songza.search_type_changed = function() {
	songza.searchType = $("#searchTypes_select option:selected").val();
	$('#video_search_query').prop('disabled', true);
	if (songza.searchType === 'search') {
		$('#video_search_query').prop('disabled', false);
		$("#searchFilters_select").hide();
		$("#searchFilters_label").hide();
	} else if (songza.searchType === 'populars') {
		$("#searchFilters_select").show();
		$("#searchFilters_label").show();
	} else {
		$("#searchFilters_select").hide();
		$("#searchFilters_label").hide();
	}
}

// search videos
songza.search = function (query, options, gui){
	try {
		songza.gui = gui;
		videos_responses = new Array();
		var page = options.currentPage;
		songza.searchType = options.searchType;
		if (options.searchFilter === 'alltime') {
			songza.searchFilter = 'all-time';
		} else {
			songza.searchFilter = options.searchFilter;
		}
		var req;
		if (songza.searchType === 'search') {
			$.get('http://anonymouse.org/cgi-bin/anon-www.cgi/http://songza.com/api/1/search/artist?query='+query,function(res) {
				songza.analyse_search_artists(res,query);
			});
			return;
		}
		if (songza.searchType === 'populars') {
			$.get('http://songza.com/api/1/chart/name/songza/'+songza.searchFilter,function(res) {
				songza.load_stations(res);
			});
			return;
		} else if (songza.searchType === 'genres') {
			req=http.get('http://songza.com/api/1/gallery/tag/genres');
		} else if (songza.searchType === 'activities') {
			req=http.get('http://songza.com/api/1/gallery/tag/activities');
		} else if (songza.searchType === 'decades') {
			req=http.get('http://songza.com/api/1/gallery/tag/decades');
		} else if (songza.searchType === 'moods') {
			req=http.get('http://songza.com/api/1/gallery/tag/moods');
		} else if (songza.searchType === 'culture') {
			req=http.get('http://songza.com/api/1/gallery/tag/culture');
		}
		req.on('response',function(response) { 
			var data = new Array(); 
			response.on("data", function(chunk) {
				data.push(chunk);
			});
			response.on('end',function(){
				var datas = JSON.parse(data.join(''));
				try {
					if (songza.searchType !== 'populars') {
						songza.load_genre(datas);
					}
				} catch(err) {
					console.log(err);
					return;
				}
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

songza.analyse_search_artists = function(datas,query) {
	if(datas.length === 0 ) {
		$('#loading').hide();
		$("#search_results p").empty().append(_("No results found for your query %",query));
		$("#search").show();
		$('#items_container').show();
	}
	var stations = {}
	stations.station_ids = [];
	$.each(datas,function(index,s) {
		var link = encodeURIComponent(songza.gui.Base64.toBase64('http://songza.com/artist/'+s.id+'/'));
		$.get('http://onlineproxyfree.com/index.php?q='+link+'/&hl=2ed',function(res){
			var list = $("li.playable", res);
			$.each(list,function(index2,s) {
				var id = $(this).attr('data-sz-station-id');
				stations.station_ids.push(id);
				if (index2+1 === list.length) {
					if (index+1 === datas.length) {
						$("#search_results p").empty().append(_('%s results found for your search %s',stations.station_ids.length,query));
						songza.load_genre_stations(stations);
					}
				}
			});
		});
	});
}

songza.analyse_search = function(datas,query) {
	var list = $("div.sz-station-basic", datas);
	var stations = {}
	stations.station_ids = [];
	$.each(list,function(index,s) {
		var id = $($("div.sz-station-basic",s).context).attr('data-sz-station-id');
		stations.station_ids.push(id);
		if (index+1 === list.length) {
			$("#search_results p").empty().append(_('%s results found for your search %s',list.length,query));
			songza.load_genre_stations(stations);
		}
	});
}

songza.load_genre = function(datas) {
	$('#loading').hide();
	$("#loading p").empty().append(_("Loading stations..."));
	$("#search").show();
	$('#items_container').empty().append('<ul id="songza_cont" class="list" style="margin:0;"></ul>').show();
	$("#search_results p").empty().append(_('Stations in the %s section ...',songza.searchType));
	$.each(datas,function(index,genre) {
		if ($('#songza_item_'+genre.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
			<div class="left"> \
				<img src="images/Playlist.png" class="video_thumbnail"> \
			</div> \
			<div class="item_infos"> \
				<span class="video_length" style="display:none;"></span> \
				<div> \
					<p style="margin-top:20px;"> \
						<a class="load_genre" data="'+encodeURIComponent(JSON.stringify(genre))+'"> \
							<b>'+genre.name+'</b> \
						</a> \
					</p> \
				<div> \
					<span> \
						<b>'+_("Total stations : ")+'</b>'+genre.station_ids.length+'</span> \
					<span style="margin-left:10px;"> \
						<b style="display:none;">'+_("Views: ")+'</b> \
					</span> \
				</div> \
			</div> \
			<div id="songza_item_'+genre.id+'"> \
			</div> \
			<a class="open_in_browser" alt="'+_("Open in songza")+'" title="'+_("Open in songza")+'" href="http://songza.com/discover/genres/'+genre.slug+'/"> \
				<img style="margin-top:8px;" src="images/export.png"> \
			</a> \
		</li>';
		$("#songza_cont").append(html);
	});
}

songza.load_genre_stations = function(datas) {
	if (songza.searchType !== 'search') {
		$("#search_results p").empty().append(_('Browsing %s section ...',datas.name));
	}
	$('#items_container').empty().append('<ul id="songza_cont" class="list" style="margin:0;"></ul>');
	console.log(datas);
	$.each(datas.station_ids,function(index,id) {
		$.get('http://anonymouse.org/cgi-bin/anon-www.cgi/http://songza.com/api/1/station/'+id,function(res) {
			var station=res;
			if ($('#songza_item_'+station.id).length === 1) {return;}
			var station = res;
			var html = '<li class="youtube_item"> \
				<div class="left"> \
					<img src="'+station.cover_url+'" class="video_thumbnail"> \
				</div> \
				<div class="item_infos"> \
					<span class="video_length" style="display:none;"></span> \
					<div> \
						<p style="margin-top:20px;"> \
							<a class="load_station" data="'+encodeURIComponent(JSON.stringify(station))+'"> \
								<b>'+station.name+'</b> \
							</a> \
						</p> \
					<div> \
						<span> \
							<b>'+_("Sounds total: ")+'</b>'+station.song_count+'</span> \
						<span style="margin-left:10px;"> \
							<b>'+_("Creator: ")+'</b>'+station.creator_name+' \
						</span> \
					</div> \
				</div> \
				<div id="songza_item_'+station.id+'"> \
				</div> \
				<a class="open_in_browser" alt="'+_("Open in songza")+'" title="'+_("Open in songza")+'" href="'+station.url+'/"> \
					<img style="margin-top:8px;" src="images/export.png"> \
				</a> \
			</li>';
			$("#songza_cont").append(html);
			$('#loading').hide();
			$("#loading p").empty().append(_("Loading stations..."));
			$("#search").show();
			$('#items_container').show();
		});
	});
}

songza.load_stations = function(stations) {
	$("#search_results p").empty().append(_('Stations in the %s section ...',songza.searchType));
	$('#items_container').empty().append('<ul id="songza_cont" class="list" style="margin:0;"></ul>');
	$.each(stations,function(index,station) {
		if ($('#songza_item_'+station.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
			<div class="left"> \
				<img src="'+station.cover_url+'" class="video_thumbnail"> \
			</div> \
			<div class="item_infos"> \
				<span class="video_length" style="display:none;"></span> \
				<div> \
					<p style="margin-top:20px;"> \
						<a class="load_station" data="'+encodeURIComponent(JSON.stringify(station))+'"> \
							<b>'+station.name+'</b> \
						</a> \
					</p> \
				<div> \
					<span> \
						<b>'+_("Sounds total: ")+'</b>'+station.song_count+'</span> \
					<span style="margin-left:10px;"> \
						<b>'+_("Creator: ")+'</b>'+station.creator_name+' \
					</span> \
				</div> \
			</div> \
			<div id="songza_item_'+station.id+'"> \
			</div> \
			<a class="open_in_browser" alt="'+_("Open in songza")+'" title="'+_("Open in songza")+'" href="'+station.url+'/"> \
				<img style="margin-top:8px;" src="images/export.png"> \
			</a> \
		</li>';
		$("#songza_cont").append(html);
		$('#loading').hide();
		$("#loading p").empty().append(_("Loading stations..."));
		$("#search").show();
		$('#items_container').show();
	});
}

songza.load_next = function(id) {
	if (songza.current_station_songsCount === $("#songza_cont li.youtube_item").length) {
		$("#search_results p").empty().append(_('All songs already loaded in the playlist...'));
		return;
	}
	$('.highlight').toggleClass('highlight','false');
	$.get('http://www.unblockpirate.com/index.php?q='+songza.gui.Base64.encode('http://songza.com/api/1/station/'+id+'/next'),function(res) {
		if ($('#songza_item_'+res.song.id).length === 1) {return;}
		var html = '<li class="youtube_item"> \
			<div class="left"> \
				<img src="'+res.song.cover_url+'" class="video_thumbnail"> \
			</div> \
			<div class="item_infos"> \
				<span class="video_length" style="display:none;"></span> \
				<div> \
					<p style="margin-top:20px;"> \
						<a class="load_song" data="'+encodeURIComponent(JSON.stringify(res))+'"> \
							<b>'+res.song.title+'</b> \
						</a> \
					</p> \
				<div> \
					<span> \
						<b>'+_("Artist: ")+'</b>'+res.song.artist.name+'</span> \
					<span style="margin-left:10px;"> \
						<b>'+_("album: ")+'</b>'+res.song.album+' \
					</span> \
				</div> \
			</div> \
			<div id="songza_item_'+res.song.id+'"> \
				<div class="resolutions_container"><a class="video_link" style="display:none;" href="'+res.listen_url+'" alt="360p"><span></span></a><a href="'+res.listen_url+'" alt="'+res.song.artist.name+' - '+res.song.title+'.mp3::'+res.song.id+'" title="Download" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />Download mp3</a></div> \
			</div> \
		</li>';
		$("#songza_cont").append(html);
		$('#loading').hide();
		$("#loading p").empty().append(_("Loading stations..."));
		$("#search").show();
		$('#items_container').show();
		var media= {};
		media.link = res.listen_url;
		media.title = res.song.artist.name +' - '+ res.song.title;
		media.type='object.item.audioItem.musicTrack';
		songza.gui.startPlay(media);
		$('#songza_item_'+res.song.id).closest('.youtube_item').toggleClass('highlight','true');
		var p = $('.highlight').position().top;
    $('#left-component').scrollTop(p+13);
	});
}

songza.play_next = function() {
	songza.load_next(songza.current_station_id);
}

module.exports = songza;
