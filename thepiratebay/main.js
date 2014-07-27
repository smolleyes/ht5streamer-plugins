/********************* engine config *************************
**************************************************************/

var tpb = {};
tpb.engine_name = 'Thepiratebay';


/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var os = require('os');
var i18n = require("i18n");
var fs = require('fs');
var piratebay = require('thepiratebay');
var _ = i18n.__;

/****************************/

// module global vars
var searchType = 'search';

// init module
tpb.init = function(gui,ht5) {
	$('#pagination').hide();
    tpb.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).on('click','.preload_cpb_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = obj.link;
        var id = ((Math.random() * 1e6) | 0);
        $(this).parent().parent().find('.mvthumb').append('<a href="#" id="'+id+'" data="" class="play_torrent"> \
                <img src="images/play-overlay.png" class="overlay" /> \
                </a>');
        $.get(link, function(res) {
            var title = $("#title", res).html();
            var info = $(".nfo", res).html();
            var img = 'http:'+$(".torpicture", res).find('img').attr('src');
            var showImg = 'block';
            if (img === "http:undefined") {
				img='';
				showImg = 'none';
			}
            var name = obj.title;
            obj.torrent = obj.magnet;
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg"><a href="" id="closePreview">X</a><div style="padding:20px;"><h2>'+title+'</h2><img src="'+img+'"style="margin:0 10px 10px 0;display:'+showImg+';float:left;width:150px;height:200px;" />'+info+'</div></div>');
            $('#'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
            $('.download-torrent').remove();
            $('#fbxMsg').hide().fadeIn(2000);
        })
    });
    
    $(ht5.document).on('click','.play_torrent',function(e){
        e.preventDefault();
        $('#fbxMsg').remove();
        $('.highlight').toggleClass('highlight','false');
        $(this).closest('li').toggleClass('highlight','true');
        var p = $('.highlight').position().top;
        $('#left-component').scrollTop(p+13);
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        tpb.gui.getTorrent(obj.torrent);
    });
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: tpb.gui.pluginsDir + 'thepiratebay/locales',
    updateFiles: true
});

if ($.inArray(tpb.gui.settings.locale, localeList) >-1) {
	console.log('Loading thepiratebay engine with locale' + tpb.gui.settings.locale);
	i18n.setLocale(tpb.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
tpb.menuEntries = ["orderBy"];
tpb.defaultMenus = ["orderBy"];
// orderBy filters and default entry
tpb.orderBy_filters = JSON.parse('{"'+_("Name desc")+'":"1","'+_("Name asc")+'":"2","'+_("Date desc")+'":"3","'+_("Date asc")+'":"4","'+_("Size desc")+'":"5","'+_("Size asc")+'":"6","'+_("Seeds desc")+'":"7","'+_("Seeds asc")+'":"8","'+_("Leeches desc")+'":"9","'+_("Leeches asc")+'":"10"}');
tpb.defaultOrderBy = '3';
// others params
tpb.has_related = false;
tpb.orderFiltersLoaded = false;
tpb.search_type_changed();

}

// search videos
tpb.search = function (query, options,gui) {
    tpb.gui = gui;
    tpb.itemsByPage = 30;
    videos_responses = new Array();
    var page = options.currentPage - 1;
    if(isNaN(page)) {
      page = 0;
      tpb.gui.current_page = 1;
    }
    var videos = {};
	piratebay.search(query, {
		category: '0',
		page: page,
		orderBy: options.orderBy
	}).then(function(results){
		if(results.length === 0 ) {
            $('#loading').hide();
            $("#search_results p").empty().append(_("No results found..."));
            $("#search").show();
            $("#pagination").hide();
            return;
        }
		tpb.itemsByPage = results[0].byPage;
		videos.totalItems = results[0].total;
		$("#search_results p").empty().append(_("%s results found for %s",videos.totalItems,query));
		analyseResults(videos,results);
	}).catch(function(err){
		$('#loading').hide();
        $("#search_results p").empty().append(_("No results found..."));
        $("#search").show();
        $("#pagination").hide();
        return;
	});
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
      var infos = {};
      infos.link = item.link;
      infos.magnet = item.magnetLink;
      infos.title = item.name;
      infos.size = item.size;
      infos.seeders = item.seeders;
      infos.leechers = item.leechers;
      infos.date = item.uploadDate;
      storeVideosInfos(videos,infos,index);
  });
}

tpb.search_type_changed = function() {
	if(tpb.orderFiltersLoaded === false) {
		$('#orderBy_select').empty();
        $.each(tpb.orderBy_filters, function(key, value){
			$('#orderBy_select').append('<option value="'+value+'">'+key+'</option>');
        });
        tpb.orderFiltersLoaded = true;
    }
	$("#searchTypesMenu_label").hide();
	$("#searchTypes_select").hide();
	$("#searchTypes_label").hide();
	$("#dateTypes_select").hide();
	$("#searchFilters_label").hide();
	$("#searchFilters_select").hide();
	$("#categories_label").hide();
	$("#categories_select").hide();
	$("#orderBy_label").show();
	$("#orderBy_select").show();
	$('#video_search_query').prop('disabled', false);
}

tpb.play_next = function() {
	try {
		$("li.highlight").next().find("a.start_media").click();
	} catch(err) {
		console.log("end of playlist reached");
		try {
			tpb.gui.changePage();
		} catch(err) {
			console.log('no more videos to play');
		}
	}
}

// store videos and return it in the right order...
function storeVideosInfos(video,infos,num) {
    video.items.push(infos); 
    videos_responses[num]=video;
    if (videos_responses.length == video.total) {
        print_videos(videos_responses);
        videos_responses = new Array();
    }
}


// functions
function print_videos(videos) {
	$('#loading').hide();
	$("#loading p").empty().append(_("Loading videos..."));
	$("#search").show();
	$("#pagination").show();
	
	// init pagination if needed
  var totalItems = parseInt(videos[0].totalItems);
  var totalPages = 1;
  if (totalItems > 30) {
    totalPages = Math.round(videos[0].totalItems / 30);
  }
  console.log(tpb.gui.current_page,totalItems,totalPages)
  if (tpb.gui.current_page === 1) {
		tpb.gui.init_pagination(totalItems,30,true,true,totalPages);
		$("#pagination").show();
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="tpb_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		var html = '<li class="list-row" style="margin:0;padding:0;"> \
						<div class="mvthumb"> \
							<img src="images/tpb.gif" style="float:left;width:100px;height:100px;" /> \
						</div> \
						<div style="margin: 0 0 0 105px;padding-top:10px;"> \
							<a href="#" class="preload_cpb_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a> \
							<div> \
								<span>'+_('Uploaded: ')+''+video.date+'</span> <span style="position: absolute;left: 280px;">'+_('Size: ')+''+video.size+'</span> <br/>\
								<span>Seeders: '+video.seeders+'</span> <span style="position: absolute;left: 280px;">leechers: '+video.seeders+'</span>\
							</div> \
							<div style="margin-top:10px;"> \
								<a class="open_in_browser" title="'+_("Open in %s",tpb.engine_name)+'" href="'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
							</div> \
						</div> \
					</li>';
		$("#tpb_cont").append(html);
	});
}

module.exports = tpb;
