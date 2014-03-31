/********************* engine config *************************
**************************************************************/

var cpb = {};
cpb.engine_name = 'Cpasbien';


/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var os = require('os');
var i18n = require("i18n");
var fs = require('fs');
var _ = i18n.__;

/****************************/

// module global vars
var searchType = 'search';

// init module
cpb.init = function(gui,ht5) {
	$('#pagination').hide();
    $('#search').hide();
    cpb.gui = ht5;
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
            var table = $("div.torrent", res).html();
            obj.torrent = $('.download-torrent a',res)[0].href;
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg"><a href="" id="closePreview">X</a>'+table+'</div>');
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
        var link = obj.torrent;
        return cpb.gui.getTorrent(link);
    });
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: cpb.gui.pluginsDir + 'cpasbien/locales',
    updateFiles: true
});

if ($.inArray(cpb.gui.settings.locale, localeList) >-1) {
	console.log('Loading cpasbien engine with locale' + cpb.gui.settings.locale);
	i18n.setLocale(cpb.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
cpb.menuEntries = ["searchTypes","orderBy","categories"];
cpb.defaultMenus = ["searchTypes","orderBy"];
// searchTypes menus and default entry
cpb.searchTypes = JSON.parse('{"'+_("Search")+'":"search"}');
cpb.defaultSearchType = 'search';
// orderBy filters and default entry
cpb.orderBy_filters = JSON.parse('{"'+_("Date")+'":"date","'+_("Seeds")+'":"seeds"}');
cpb.defaultOrderBy = 'date';
// others params
cpb.has_related = false;
cpb.categoriesLoaded = false;

}

// search videos
cpb.search = function (query, options,gui) {
    cpb.gui = gui;
    videos_responses = new Array();
    var page = options.currentPage - 1;
    var query = query.replace(/ /g,'+');
    var url;
		url='http://www.cpasbien.me/recherche/'+query+'/page-'+page+',trie-'+options.orderBy+'-d';
    console.log(url)
    $.get(url,function(res){
      var videos = {};
      var list=$('a.lien-rechercher',res);
      if(list.length === 0 ) {
          $('#loading').hide();
          $("#search_results p").empty().append(_("No results found..."));
          $("#search").show();
          $("#pagination").hide();
          return;
      }
      try {
        videos.totalItems = parseInt($('th.titre',res)[0].innerHTML.split(':')[1].trim().replace(' torrents',''));
        analyseResults(videos,list);
      } catch(err) {
        videos.totalItems = list.length;
        analyseResults(videos,list);
      }
    });
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
      var infos = {};
      infos.link = $(this).attr('href');
      infos.title = $(this).text();
      storeVideosInfos(videos,infos,index);
  });
}

cpb.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	if (searchType === 'categories') {
		if (cpb.categoriesLoaded === false) {
			$('#search').show();
			$('#search_results p').empty().append(_('Loading categories, please wait...')).show();
		}
		$("#orderBy_select").hide();
		$("#orderBy_label").hide();
		$("#categories_label").show();
		$("#categories_select").show();
		$("#dateTypes_select").hide();
		$("#searchFilters_select").hide();
		$('#video_search_query').prop('disabled', true);
	} else {
		$("#categories_select").hide();
		$("#dateTypes_select").hide();
		$("#searchFilters_select").hide();
		$("#orderBy_select").show();
		$("#search p").empty().append(_("<p>cpb %s section</p>",searchType));
		$('#video_search_query').prop('disabled', false);
	}
}

cpb.play_next = function() {
	try {
		$("li.highlight").next().find("a.start_media").click();
	} catch(err) {
		console.log("end of playlist reached");
		try {
			cpb.gui.changePage();
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
  var totalItems = videos[0].totalItems;
  var totalPages = 1;
  if (videos[0].totalItems > 30) {
    totalPages = Math.round(videos[0].totalItems / 30);
  }
  if (cpb.gui.current_page === 1) {
      if (searchType === 'search') {
        cpb.gui.init_pagination(totalItems,30,true,true,totalPages);
      } else {
        cpb.gui.init_pagination(0,30,true,true,totalPages);
      }
      $("#pagination").show();
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="cpb_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		var html = '<li class="list-row" style="margin:0;padding:0;"> \
            <div class="mvthumb"> \
						<img src="images/cpb.png" style="float:left;width:100px;margin-top:5px;" /> \
						</div> \
            <div style="margin: 0 0 0 105px;padding-top:10px;"> \
							<a href="#" class="preload_cpb_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a> \
							<div> \
								<a class="open_in_browser" title="'+("Open in %s",cpb.engine_name)+'" href="'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
							</div> \
						</div> \
					</li>';
		$("#cpb_cont").append(html);
	});
}

module.exports = cpb;
