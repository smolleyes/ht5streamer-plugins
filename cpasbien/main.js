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
    cpb.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).off('click','.preload_cpb_torrent');
    $(ht5.document).on('click','.preload_cpb_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = obj.link;
        var id = obj.id;
        if($('#cpb_play_'+id).length === 0) {
			$(this).parent().parent().find('.mvthumb').append('<a id="cpb_play_'+id+'" data="" class="play_cpb_torrent"> \
					<img src="images/play-overlay.png" class="overlay" /> \
					</a>');
        }
        $.get(link, function(res) {
            var table = $("div.torrent", res).html();
            var name = path.basename($('.download-torrent a',res)[0].href);
            obj.torrent = 'http://www.cpasbien.pe/_torrents/'+name;
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg"><a href="" id="closePreview">X</a>'+table+'</div>');
            $('.download-torrent').remove();
            $('#fbxMsg').hide().fadeIn(2000);
            if($('#cpb_downlink_'+obj.id).length === 0) {
				$('#cpb_play_'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
				var n = '<a href="'+obj.torrent+'" id="cpb_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Download")+'</span></a>';
				$('#torrent_'+id).append(n);
				if(cpb.gui.freeboxAvailable) {
					var r = '<a href="'+obj.torrent+'" id="cpb_downlinkFbx_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile_fbx" style="margin-left:10px;"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Télécharger avec freebox")+'</span></a>';
					$('#torrent_'+id).append(r);
				}
			}
        })
    });
    
    $(ht5.document).off('click','.play_cpb_torrent');
    $(ht5.document).on('click','.play_cpb_torrent',function(e){
        e.preventDefault();
        console.log('play clicked')
        $('#fbxMsg').remove();
        $('.highlight').toggleClass('highlight','false');
        $(this).closest('li').toggleClass('highlight','true');
        var p = $('.highlight').position().top;
        $('#left-component').scrollTop(p+13);
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        cpb.gui.getTorrent(obj.torrent);
    });
    
    $(ht5.document).off('click','.download_torrentFile');
    $(ht5.document).on('click','.download_torrentFile',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        cpb.gui.getAuthTorrent(obj.torrent,false,false);
    });
     
    $(ht5.document).off('click','.download_torrentFile_fbx');
    $(ht5.document).on('click','.download_torrentFile_fbx',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        cpb.gui.getAuthTorrent(obj.torrent,false,true);
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
cpb.searchTypes = JSON.parse('{"'+_("Search")+'":"search","'+_("Navigation")+'":"navigation"}');
cpb.defaultSearchType = 'search';
// orderBy filters and default entry
cpb.orderBy_filters = JSON.parse('{"'+_("Date")+'":"date","'+_("Seeds")+'":"seeds"}');
cpb.defaultOrderBy = 'date';
// orderBy filters and default entry
cpb.category_filters = JSON.parse('{"'+_("Movies")+'":"films","'+_("Series")+'":"series"}');
cpb.defaultCategory = 'films';
// others params
cpb.has_related = false;
cpb.categoriesLoaded = false;

}

// search videos
cpb.search = function (query, options,gui) {
    cpb.gui = gui;
    videos_responses = new Array();
    var page = options.currentPage - 1;
    if(isNaN(page)) {
      page = 0;
      cpb.gui.current_page = 1;
    }
    var query = query.replace(/ /g,'+');
    var url;
    var videos = {};
    if(options.searchType === "search") {
      url='http://www.cpasbien.me/recherche/'+query+'/page-'+page+',trie-'+options.orderBy+'-d';
      $.get(url,function(res){
        var list=$('.listing-torrent > table > tbody > tr',res);
        if(list.length === 0 ) {
            $('#loading').hide();
            $("#search_results p").empty().append(_("No results found..."));
            $("#search").show();
            $("#pagination").hide();
            return;
        }
        try {
          videos.totalItems = parseInt($($('#recherche th.titre',res)[0]).text().split(':').pop().trim().split(' ')[0]);
          analyseResults(videos,list);
        } catch(err) {
          videos.totalItems = list.length;
          analyseResults(videos,list);
        }
      });
    } else {
      url='http://www.cpasbien.me/view_cat.php?categorie='+options.category+'&page='+page+'';
      $.get(url,function(res){
        var list=$('.listing-torrent > table > tbody > tr',res);
        if(list.length === 0 ) {
            $('#loading').hide();
            $("#search_results p").empty().append(_("No results found..."));
            $("#search").show();
            $("#pagination").hide();
            return;
        }
        videos.totalItems = $('th.titre', res)[0].innerHTML.split(':')[1].trim().replace(' torrents','').replace(/[\)\(]/g,'').replace(/<a.*/,'').trim();
        analyseResults(videos,list);
      });
    }
    console.log(url);
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
      var infos = {};
      infos.link = $(this).find('a')[0].href;
      infos.title = $(this).find('a')[0].innerHTML;
      infos.size = $(this).find('td')[1].innerHTML;
      infos.seeders = $(this).find('td')[2].innerHTML;
      infos.leechers = $(this).find('td')[3].innerHTML;
      storeVideosInfos(videos,infos,index);
  });
}

cpb.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	category = $("#categories_select").val();
	if (searchType === 'navigation') {
		if(cpb.categoriesLoaded === false) {
			$.each(cpb.category_filters, function(key, value){
				$('#categories_select').append('<option value="'+value+'">'+key+'</option>');
			});
			cpb.categoriesLoaded = true;
			category = $("#categories_select").val();
		}
		$("#orderBy_select").hide();
		$("#orderBy_label").hide();
		$("#categories_label").show();
		$("#categories_select").show();
		$("#dateTypes_select").hide();
		$("#searchFilters_select").hide();
		$('#video_search_query').prop('disabled', true);
	} else {
		$("#dateTypes_select").hide();
		$("#searchFilters_label").hide();
		$("#searchFilters_select").hide();
		$("#categories_label").hide();
		$("#categories_select").hide();
		$("#orderBy_label").show();
		$("#orderBy_select").show();
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
        cpb.gui.init_pagination(totalItems,30,false,true,totalPages);
      } else {
        cpb.gui.init_pagination(0,30,true,true,0);
      }
      $("#pagination").show();
  } else {
	if (searchType !== 'search') {
		cpb.gui.init_pagination(0,30,false,true,0);
	} else {
		cpb.gui.init_pagination(totalItems,30,true,true,totalPages);
	}	
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="cpb_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		$.get(video.link,function(res) {
			var img = $(".affiche img",res).attr('src');
			video.id = ((Math.random() * 1e6) | 0);
			var html = '<li class="list-row" style="margin:0;padding:0;"> \
					<div class="mvthumb"> \
								<img src="'+img+'" style="float:left;width:100px;height:100px;" /> \
								</div> \
					<div style="margin: 0 0 0 105px;padding-top:10px;"> \
									<a href="#" class="preload_cpb_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a> \
									<div> \
							<span><b>Taille:</b> '+video.size+' </span> \
							<span style="margin-left:50px;"><b>Sources:</b> '+video.seeders+' </span> \
						  </div>  \
									<div id="torrent_'+video.id+'"> \
										<a class="open_in_browser" title="'+("Open in %s",cpb.engine_name)+'" href="'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
									</div> \
								</div> \
							</li>';
				$("#cpb_cont").append(html);
			});
	});
}

module.exports = cpb;
