/********************* engine config *************************
**************************************************************/

var omgTorrent = {};
omgTorrent.engine_name = 'Omgtorrent';


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
omgTorrent.init = function(gui,ht5) {
	$('#pagination').hide();
    $('#search').hide();
    omgTorrent.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).off('click','.preload_omg_torrent');
    $(ht5.document).on('click','.preload_omg_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = obj.link;
        var id = obj.id;
        if($('#omg_play_'+id).length === 0) {
			$(this).parent().parent().find('.mvthumb').append('<a href="#" id="omg_play_'+id+'" data="" class="play_omg_torrent"> \
					<img src="images/play-overlay.png" class="overlay" /> \
					</a>');
        }
        $.get(link, function(res) {
            var table = $(".infos_fiche", res).html();
            obj.torrent = 'http://www.omgtorrent.com'+$('#lien_dl',res).attr("href");
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg"><a href="" id="closePreview">X</a>'+table+'</div>');
            $('a [src="/img/icone_maj.png"]').parent().remove();
            $($('#fbxMsg img')[0]).attr('src','images/s.png');
            $($('#fbxMsg img')[1]).attr('src','images/c.png');
            $('#fbxMsg').hide().fadeIn(2000);
            if($('#omg_downlink_'+obj.id).length === 0) {
				$('#omg_play_'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
				var n = '<a href="'+obj.torrent+'" id="omg_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_omgTorrentFile"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Download")+'</span></a>';
				$('#torrent_'+id).append(n);
				if(omgTorrent.gui.freeboxAvailable) {
					var r = '<a href="'+obj.torrent+'" id="omg_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_omgTorrentFile_fbx" style="margin-left:10px;"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Télécharger avec freebox")+'</span></a>';
					$('#torrent_'+id).append(r);
				}
			}
        }).error(function(err){
			alert('can t load page '+obj.torrent)
		})
    });
    
    $(ht5.document).off('click','.play_omg_torrent');
    $(ht5.document).on('click','.play_omg_torrent',function(e){
        e.preventDefault();
        console.log('play clicked')
        $('#fbxMsg').remove();
        $('.highlight').toggleClass('highlight','false');
        $(this).closest('li').toggleClass('highlight','true');
        var p = $('.highlight').position().top;
        $('#left-component').scrollTop(p+13);
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        omgTorrent.gui.getTorrent(obj.torrent);
    });
    
    $(ht5.document).off('click','.download_omgTorrentFile');
    $(ht5.document).on('click','.download_omgTorrentFile',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        omgTorrent.gui.downloadFile(obj.torrent,obj.title,obj.id,true)
    });
    
    $(ht5.document).off('click','.download_omgTorrentFile_fbx');
    $(ht5.document).on('click','.download_omgTorrentFile_fbx',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        omgTorrent.gui.addFreeboxDownload(obj.torrent);
    });
    
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: omgTorrent.gui.pluginsDir + 'omgtorrent/locales',
    updateFiles: true
});

if ($.inArray(omgTorrent.gui.settings.locale, localeList) >-1) {
	console.log('Loading omgtorrent engine with locale' + omgTorrent.gui.settings.locale);
	i18n.setLocale(omgTorrent.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
omgTorrent.menuEntries = ["searchTypes","orderBy","categories"];
omgTorrent.defaultMenus = ["searchTypes","orderBy"];
// searchTypes menus and default entry
omgTorrent.searchTypes = JSON.parse('{"'+_("Search")+'":"search","'+_("Navigation")+'":"navigation"}');
omgTorrent.defaultSearchType = 'search';
// orderBy filters and default entry
omgTorrent.orderBy_filters = JSON.parse('{"'+_("Date")+'":"id","'+_("Seeds")+'":"seeders"}');
omgTorrent.defaultOrderBy = 'id';
// category filters and default entry
omgTorrent.category_filters = JSON.parse('{"'+_("Movies")+'":"films"}');
omgTorrent.defaultCategory = 'films';
// others params
omgTorrent.has_related = false;
omgTorrent.categoriesLoaded = false;

}

// search videos
omgTorrent.search = function (query, options,gui) {
    omgTorrent.gui = gui;
    videos_responses = new Array();
    var page = options.currentPage;
    if(isNaN(page)) {
      page = 1;
      omgTorrent.gui.current_page = 1;
    }
    var url;
    if(searchType === 'search') {
		url='http://www.omgtorrent.com/recherche/?order='+options.orderBy+'&orderby=desc&query='+encodeURIComponent(query)+'&page='+page;
    } else {
		var category = options.category;
		url='http://www.omgtorrent.com/'+category+'/?order='+options.orderBy+'&orderby=desc&page='+page;
	}
    $.get(url,function(res){
      var videos = {};
      var list;
      if(searchType === 'search') {
		list=$($('table.table_corps',res)[0]).find('tr:not(#table_entete)');
	  } else {
		list=$('.centrer div.cadre:not(".genre")',res);
	  }
      console.log(url,list,res)
      if(list.length === 0 || $('.message.erreur',res).length > 0) {
          $('#loading').hide();
          $("#search_results p").empty().append(_("No results found..."));
          $("#search").show();
          $("#pagination").hide();
          return;
      }
      try {
        var number = parseInt($('.nav a', res).last().prev().text());
        if (isNaN(number)) {
          videos.totalItems = list.length;
        } else {
          videos.totalItems = parseInt(number) * 30;
        }
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
	  if(searchType === 'search') {
		  infos.cat = $(this).find('td')[0].innerHTML;
		  infos.link = 'http://www.omgtorrent.com/films'+$(this).find('a')[0].href.replace(/.*\/films/,'').replace('file://','');
		  infos.title = $(this).find('a')[0].innerHTML;
		  infos.seeds = $(this).find('td')[3].innerHTML;
		  infos.leechers = $(this).find('td')[4].innerHTML;
		  infos.size = $(this).find('td')[2].innerHTML;
		  storeVideosInfos(videos,infos,index);
	  } else {
		  infos.link = 'http://www.omgtorrent.com/films'+$(this).find('a')[0].href.replace(/.*\/films/,'').replace('file://','');
		  infos.title = $($(this).find('img')[0]).attr('alt');
		  infos.seeds = $(this).find('.sources').text();
		  infos.leechers = $(this).find('.clients').text();
		  infos.size = '';
		  storeVideosInfos(videos,infos,index);
	  }
  });
}

omgTorrent.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	if(searchType === 'search') {
		$("#categories_select").hide();
		$("#categories_label").hide();
		$("#search p").empty().append(_("<p>omgtorrent %s section</p>",searchType));
	$('#video_search_query').prop('disabled', false);
	} else {
		if (omgTorrent.categoriesLoaded === false) {
			$('#categories_select').empty();
			$.each(omgTorrent.category_filters, function(key, value){
				$('#categories_select').append('<option value="'+value+'">'+key+'</option>');
			});
			$("#categories_select").val(omgTorrent.defaultCategory);
			omgTorrent.categoriesLoaded = true;
		}
		$("#categories_select").show();
		$("#categories_label").show();
		$("#search p").empty().append(_("<p>omgtorrent %s section</p>",searchType));
	}
}

omgTorrent.play_next = function() {
	try {
		$("li.highlight").next().find("a.start_media").click();
	} catch(err) {
		console.log("end of playlist reached");
		try {
			omgTorrent.gui.changePage();
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
    totalPages = videos[0].totalItems / 30;
  }
  if (omgTorrent.gui.current_page === 1) {
      if (searchType === 'search') {
        omgTorrent.gui.init_pagination(totalItems,30,true,true,totalPages);
      } else {
        omgTorrent.gui.init_pagination(0,30,true,true,0);
      }
      $("#pagination").show();
  } else {
      if (searchType !== 'search') {
		omgTorrent.gui.init_pagination(0,30,true,true,0);
	  }
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="omgtorrent_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		video.id = ((Math.random() * 1e6) | 0);
		var html = '<li class="list-row" style="margin:0;padding:0;"> \
            <div class="mvthumb"> \
						<img src="images/omgtorrent.png" style="float:left;height:40px;width:100px;margin-top:20px;" /> \
						</div> \
            <div style="margin: 0 0 0 105px;padding-top:10px;"> \
							<a href="#" class="preload_omg_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a> \
							<div> \
              <div> \
                <span><b>Taille:</b> '+video.size+' </span> \
                <span><b>Sources:</b> '+video.seeds+' </span> \
                <span><b>Client:</b> '+video.leechers+'</span> \
              </div>  \
              <div id="torrent_'+video.id+'"> \
					<a class="open_in_browser" title="'+("Open in %s",omgTorrent.engine_name)+'" href="'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
				</div> \
			</div> \
						</div> \
					</li>';
		$("#omgtorrent_cont").append(html);
	});
}

module.exports = omgTorrent;
