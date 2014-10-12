/********************* engine config *************************
**************************************************************/

var kick = {};
kick.engine_name = 'kickass';
var kick_eng=require('kickass-torrent');

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
kick.init = function(gui,ht5) {
	$('#pagination').hide();
    kick.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).off('click','.preload_kick_torrent');
    $(ht5.document).on('click','.preload_kick_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = obj.link;
        var id = obj.id;
        if($('#kick_play_'+id).length === 0) {
			$(this).parent().parent().find('.mvthumb').append('<a id="kick_play_'+id+'" data="" class="play_kick_torrent"> \
					<img src="images/play-overlay.png" class="overlay" /> \
					</a>');
        }
        $.get(link, function(res) {
            var table = $("#movieinfo", res).html();
            if(table == undefined) {
				var table = $("#tab-main", res).html();
			}
            table += $("#desc", res).html();
            var name = obj.title;
            obj.torrent = obj.torrentLink;
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg"><a href="" id="closePreview" style="float:left;">X</a><h3 style="margin-left:20px;"><b>'+name+'</b></h3><div>'+table.replace(/src="\/\//g,'src="http://')+'</div></div>');
            $('.download-torrent').remove();
            $('#fbxMsg').hide().fadeIn(2000);
            $('#fbxMsg').find('b,span,p,table,tr,td').css('color', 'white');
            $('#fbxMsg').find('a,h1,h2,h3').css('color', 'orange');
            $($('#fbxMsg').find('div')[0]).css('margin-top', '10px');
            if($('#kick_downlink_'+obj.id).length === 0) {
				$('#kick_play_'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
				var n = '<a href="'+obj.torrent+'" id="kick_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Download")+'</span></a>';
				$('#torrent_'+id).append(n);
				if(kick.gui.freeboxAvailable) {
					var r = '<a href="'+obj.torrent+'" id="kick_downlinkFbx_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile_fbx" style="margin-left:10px;"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Télécharger avec freebox")+'</span></a>';
					$('#torrent_'+id).append(r);
				}
			}
        })
    });
    
    $(ht5.document).on('click','#fbxMsg a',function(e) {
		e.preventDefault();
		ht5.gui.Window.open('http://kickass.to'+$(this).attr('href').replace(/(.*)?\/\//,''),{"always-on-top":true,position:"center",toolbar:false,height:800,width:1024});
	})
    
    $(ht5.document).off('click','.play_kick_torrent');
    $(ht5.document).on('click','.play_kick_torrent',function(e){
        e.preventDefault();
        console.log('play clicked')
        $('#fbxMsg').remove();
        $('.highlight').toggleClass('highlight','false');
        $(this).closest('li').toggleClass('highlight','true');
        var p = $('.highlight').position().top;
        $('#left-component').scrollTop(p+13);
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        kick.gui.getTorrent(obj.torrent);
    });
    
    $(ht5.document).off('click','.download_torrentFile');
    $(ht5.document).on('click','.download_torrentFile',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        kick.gui.getAuthTorrent(obj.torrent,false,false)
    });
     
    $(ht5.document).off('click','.download_torrentFile_fbx');
    $(ht5.document).on('click','.download_torrentFile_fbx',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        kick.gui.getAuthTorrent(obj.torrent,false,true)
    });
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: kick.gui.pluginsDir + 'kickass/locales',
    updateFiles: true
});

if ($.inArray(kick.gui.settings.locale, localeList) >-1) {
	console.log('Loading kick engine with locale' + kick.gui.settings.locale);
	i18n.setLocale(kick.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
kick.menuEntries = ["searchTypes","orderBy"];
kick.defaultMenus = ["searchTypes","orderBy"];
// searchTypes menus and default entry
kick.searchTypes = JSON.parse('{"'+_("Search")+'":"search"}');
kick.defaultSearchType = 'search';
// orderBy filters and default entry
kick.orderBy_filters = JSON.parse('{"'+_("Date")+'":"time_add","'+_("Seeds")+'":"seeds"}');
kick.defaultOrderBy = 'time_add';
// others params
kick.has_related = false;
kick.categoriesLoaded = true;

}

// search videos
kick.search = function (query, options,gui) {
    kick.gui = gui;
    videos_responses = new Array();
    var page = options.currentPage;
    if(isNaN(page)) {
      page = 0;
      kick.gui.current_page = 1;
    }
    var url;
    var videos = {};
    if(options.searchType === "search") {
		kick_eng({
			q: ''+query+'',//actual search term
			field:''+options.orderBy+'',//seeders, leechers, time_add, files_count, empty for best match
			order:'desc',//asc or desc
			page: page,//page count, obviously
			url: 'http://kickass.to',//changes site default url (http://kick.to)
		},function(e, data){
			console.log(data)
			if(e || data.total_results == 0) {
				$('#loading').hide();
				$("#search_results p").empty().append(_("No results found..."));
				$("#search").show();
				$("#pagination").hide();
				return;
			} else {
				if(data.total_results == 0) {
					$('#loading').hide();
					$("#search_results p").empty().append(_("No results found..."));
					$("#search").show();
					$("#pagination").hide();
					return;	
				} else {
					videos.totalItems = data.total_results;
					var list = data.list;
					analyseResults(videos,list);
				}
			}
		})
    }
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
	  try {
		  var infos = {};
		  infos.torrentLink = item.torrentLink;
		  infos.link = item.guid;
		  infos.title = item.title;
		  infos.seeders = item.seeds;
		  infos.leechs = item.leechs;
		  var converted_size = Math.floor( Math.log(item.size) / Math.log(1024) );
		  infos.size = ( item.size / Math.pow(1024, converted_size) ).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted_size];
		  console.log(infos)
		  storeVideosInfos(videos,infos,index);
	  } catch(err) { console.log(err); }
  });
}

kick.search_type_changed = function() {
	searchType = $("#searchTypes_select").val();
	category = $("#categories_select").val();
	if (searchType === 'navigation') {
		if(kick.categoriesLoaded === false) {
			$.each(kick.category_filters, function(key, value){
				$('#categories_select').append('<option value="'+value+'">'+key+'</option>');
			});
			kick.categoriesLoaded = true;
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

kick.play_next = function() {
	try {
		$("li.highlight").next().find("a.start_media").click();
	} catch(err) {
		console.log("end of playlist reached");
		try {
			kick.gui.changePage();
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
  if (videos[0].totalItems > 25) {
    totalPages = Math.round(videos[0].totalItems / 25);
  }
  if (kick.gui.current_page === 1) {
      if (searchType === 'search') {
        kick.gui.init_pagination(totalItems,25,true,true,totalPages);
      } else {
        kick.gui.init_pagination(0,25,true,true,0);
      }
      $("#pagination").show();
  } else {
	if (searchType !== 'search') {
		kick.gui.init_pagination(0,25,true,true,0);
	} else {
		kick.gui.init_pagination(totalItems,25,true,true,totalPages);
	}	
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="kick_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		$.get(video.link,function(res) {
	        video.id = ((Math.random() * 1e6) | 0);
	        try {
	            var img = 'http:'+$('.movieCover img',res).attr('src');
	        } catch(err) {
	            var img = "images/kick.png";
	        }
	        if(img === "http:undefined") {
	        	var img = "images/kick.png";
	        }
			var html = '<li class="list-row" style="margin:0;padding:0;"> \
	            <div class="mvthumb"> \
							<img src="'+img.replace('file:','http:')+'" style="float:left;width:100px;height:100px;" /> \
							</div> \
	            <div style="margin: 0 0 0 105px;padding-top:10px;"> \
								<a href="#" class="preload_kick_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a> \
								<div> \
								<span><b>Taille:</b> '+video.size+' </span> \
								<span style="margin-left:50px;"><b>Sources:</b> '+video.seeders+' </span> \
							  </div>  \
								<div id="torrent_'+video.id+'"> \
									<a class="open_in_browser" title="'+("Open in %s",kick.engine_name)+'" href="'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
								</div> \
							</div> \
						</li>';
			$("#kick_cont").append(html);
		});
	});
}

module.exports = kick;
