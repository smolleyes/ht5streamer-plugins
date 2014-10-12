/********************* engine name **************************/

var t411 = {};
t411.engine_name = 'T411';
t411.initialized = false;

/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var i18n = require("i18n");
var _ = i18n.__;

/****************************/

// global var
var has_more = true;
var t411_win;
var old_count = 0;
var sectionsList = new Array('Japanimation','Mangas','Dramas','VF','VF HD','VO/VOST','VO/VOST HD','Album Complet','OST / BO','Singles','Compilation Musical','VO/VOSTFR','Albums','Compilations Musicales','OST','Section Adulte (+18)','Films Adulte','Livres Adulte','BD Adulte','Films DVDRip & BDRip','Films VO & VOSTFR','Films TS, R5, Cam, DVDScreen','BluRay 720p, 1080p','Films HD 720p, 1080p, 3D','Films HD 720p, 1080p, 3D.','Séries TV','Dessins animés','Documentaires, Spectacles, Concerts, Émissions TV, Sports','Musique','Musique HQ / Flac','Clips Musicaux','Manga','Drama','Section ADULTE','Romans, Livres','Presse, Magazine','Bande dessinée', 'Romans','Livres','Livres Audio');
var scannedLinks = 0;
var totalFiles = 0;
var folderList = [];
var linksList = [];
var boardList=[];
var videos_responses = new Array();

t411.init = function(gui,ht5,notif) {
  t411.mainWin = gui;
  t411.gui = ht5;
  t411.notif = notif;
  t411.page;
  t411.ignore_section = false;
  
  if (t411.initialized === false ) {
    $('#items_container').empty()
    //load page
    $.get('http://www.t411.me',function(res){
        if ($('.loginBar span',res)[0].innerHTML === '|') {
          t411.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Please login to the website with the Always connected option checked then close the window to continue... !"),btnId:'showPage',btnTitle:_('Ok'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'});
          $('#showPage').click(function(e) {
              e.preventDefault();
              t411.page = t411.mainWin.Window.open('http://www.t411.me/users/login/', {
                    "position":"center",
                    "width": 880,
                    "height": 800,
                    "show": true
              });
              t411.page.on('loaded', function(){
                console.log('page loaded')
                
              });
              t411.page.on('close', function() {
                this.hide();
                this.close(true);
                t411.initialized = true;
                $('#search').show();
                $("#search_results").empty().append('<p>'+_("t411 engine loaded successfully...")+'</p>');
//t411.loadMenus();
              });
          });
        // si resélection du plugin
        } else if ($('#categories_select option').length === 0) {
            t411.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("t411.me connexion ok !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
            $('#search').show();
            $("#search_results").empty().append('<p>'+_("t411 engine loaded successfully...")+'</p>');
            //t411.loadMenus();
            t411.initialized = true;
        } else {
            t411.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("t411.me connexion ok !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
            $('#search').show();
            $("#search_results").empty().append('<p>'+_("t411 engine loaded successfully...")+'</p>');
            t411.initialized = true;
        }
    });
}
  
  // load engine
  loadEngine();
  //play videos
  $(ht5.document).off('click','.preload_t411_torrent');
  $(ht5.document).on('click','.preload_t411_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = 'http://'+obj.link;
        var id = obj.id;
        if($('#t411_play_'+id).length === 0) {
			$(this).parent().parent().parent().find('.mvthumb').append('<a id="t411_play_'+id+'" data="" class="play_t411_torrent"> \
					<img src="images/play-overlay.png" class="overlay" /> \
					</a>');
        }
        $.get(link, function(res) {
            var table = $("article", res).html()
            table += $(".accordion",res).html();
            obj.torrent = 'http://www.t411.me/torrents'+$('a.btn',res)[1].href.replace(/(.*?)\/torrents/,'');
            $('#fbxMsg').empty().remove();
            $('#preloadTorrent').remove();
            $('.mejs-overlay-button').hide();
            $('.mejs-container').append('<div id="fbxMsg" style="color:white !important;"><a href="" id="closePreview">X</a>'+table+'</div>');
            $('.download-torrent').remove();
            $('#fbxMsg').hide().fadeIn(2000);
            $('#fbxMsg a').attr('href','#');
            $('#fbxMsg').find('b,span,p,table,tr,td').css('color', 'white');
            $('#fbxMsg').find('a,h1,h2,h3').css('color', 'orange');
            $($('#fbxMsg').find('div')[0]).css('margin-top', '50px');
            if($('#t411_downlink_'+obj.id).length === 0) {
				$('#t411_play_'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
				var n = '<a href="'+obj.torrent+'" id="t411_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Download")+'</span></a>';
				$('#torrent_'+id).append(n);
				if(t411.gui.freeboxAvailable) {
					var r = '<a href="'+obj.torrent+'" id="t411_downlinkFbx_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'" class="download_torrentFile_fbx" style="margin-left:10px;"><img src="images/down_arrow.png" width="16" height="16" /><span class="downloadText">'+_("Télécharger avec freebox")+'</span></a>';
					$('#torrent_'+id).append(r);
				}
			}
        })
    });
    
    $(ht5.document).off('click','.play_t411_torrent');
    $(ht5.document).on('click','.play_t411_torrent',function(e){
        e.preventDefault();
        console.log('play clicked')
        $('#fbxMsg').remove();
        $('.highlight').toggleClass('highlight','false');
        $(this).closest('li').toggleClass('highlight','true');
        var p = $('.highlight').position().top;
        $('#left-component').scrollTop(p+13);
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        //t411.gui.getTorrent(obj.torrent);
		t411.gui.getAuthTorrent(obj.torrent,true);
    });
    
    $(ht5.document).off('click','.download_torrentFile');
    $(ht5.document).on('click','.download_torrentFile',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        t411.gui.getAuthTorrent(obj.torrent,false,false);
    });
     
    $(ht5.document).off('click','.download_torrentFile_fbx');
    $(ht5.document).on('click','.download_torrentFile_fbx',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        t411.gui.getAuthTorrent(obj.torrent,false,true);
    });
	
  
  
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr', 'es'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: t411.gui.pluginsDir + 't411/locales',
    updateFiles: true
});
if ($.inArray(t411.gui.settings.locale, localeList) >-1) {
	console.log('Loading t411 engine with locale' + t411.gui.settings.locale);
	i18n.setLocale(t411.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
t411.menuEntries = ["searchTypes","orderBy"];
t411.defaultMenus = ["searchTypes","orderBy"];
// searchTypes menus and default entry
t411.searchTypes = JSON.parse('{"'+_("Search")+'":"search","'+_("Top 100")+'":"top100"}');
t411.defaultSearchType = 'search';
// orderBy filters and default entry
t411.orderBy_filters = JSON.parse('{"'+_("Date")+'":"added","'+_("Seeds")+'":"seeders","'+_("Size")+'":"size"}');
t411.defaultOrderBy = 'seeders';
//t411.search_type_changed();

}

t411.loadMenus = function() {
    var sublist = [];
    var i = 0;
    boardList = new Array();
    scanSublist = false;
    $.get('http://t411.me/index.php',function(res){
      $('#categories_select').empty();
      var content = $('#main_content', res);
      var sections = $(content).find('.windowbg2');
      var subList = [];
      $.each(sections,function(index,name){
        var id = $(this).attr('id');
        var name = $(this).find('td.info a.subject').text();
        var href = $(this).find('td.info a.subject').attr('href');
        if ($(content).find('tr#'+id+'_children').length !== 0) {
          subList.push(id);
        } else {
          if(in_array(name,sectionsList) !== -1){
            $('#categories_select').append('<option value="'+name+'::'+href+'">'+name+'</option>');
			var bid = href.match(/board=(.*?)\./).pop();
			boardList.push("&brd%5B"+bid+"%5D="+bid);
          }
        }
        if (index+1 === sections.length){
          $.each(subList,function(index,item){
            var name = $(content).find('tr#'+item+' a.subject').text();
            var href = $(content).find('tr#'+item+' a.subject').attr('href');
            if(in_array(name,sectionsList) !== -1){
              $('#categories_select').append('<option value=""></option>');
              $('#categories_select').append('<option value="">'+name+'</option>');
              $('#categories_select').append('<option value="">--------------------------</option>');
              var l = $(content).find('tr#'+item+'_children a');
              $.each(l,function(index,res) {
                var subname = $(this).text();
                var subhref = $(this).attr('href');
                if(subname !== '') {
                  $('#categories_select').append('<option value="'+subname+'::'+subhref+'">'+subname+'</option>');
				  var bid = href.match(/board=(.*?)\./).pop();
				  boardList.push("&brd%5B"+bid+"%5D="+bid);
                }
                //if (l.length === index+1) {
                    //t411.search_type_changed();
                //}
              });
            }
          });
        }
      });
    });
}

t411.search = function(query,options) {
  t411.currentSearch = query;
  videos_responses = new Array();
  if (t411.searchType === 'top100') {
      var link = "http://www.t411.me/top/100/";
      var videos = {};
    $.get(link,function(res){
      var list = $('table.results tbody tr',res);
	  if(list.length === 0 ) {
		  $('#loading').hide();
		  $("#search_results p").empty().append(_("No results found..."));
		  $("#search").show();
		  $("#pagination").hide();
		  return;
	  }
	  try {
		  videos.totalItems = 100;
		  analyseResults(videos,list);
	  } catch(err) {
		 videos.totalItems = 100;
		 analyseResults(videos,list);
	  }
   });
  } else {
    if (query !== '') {
        var method = NaN;
        $('#loading').show();
        $('#search').hide();
        var page = options.currentPage - 1;
        var link = "http://www.t411.me/torrents/search/?search="+query.replace(/ /g,'+')+"&order="+options.orderBy+"&cat=210&type=desc&page="+page;
        var videos = {};
        $.get(link).done(function( res ) {
		  var list = $('table.results tbody tr',res);
          if(list.length === 0 ) {
              $('#loading').hide();
              $("#search_results p").empty().append(_("No results found..."));
              $("#search").show();
              $("#pagination").hide();
              return;
		  }
          try {
			  videos.totalItems = parseInt($('.pagebar a',res).last().prev().text().split('-')[1].trim());
			  analyseResults(videos,list);
		  } catch(err) {
			 videos.totalItems = list.length;
			 analyseResults(videos,list);
		  }
      });
    } else {
        $('#loading').hide();
        $('#search').show();
        $('#video_search_query').attr('placeholder','').focus();
        return;
    }
  }
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
      var infos = {};
      infos.link = $($(this).find('td')[1]).find('a').attr('href');
      infos.title = $($(this).find('td')[1]).find('a').text();
      infos.seeders = $($(this).find('td')[7]).text();
      infos.size = $($(this).find('td')[5]).text();
      storeVideosInfos(videos,infos,index);
  });
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
  if (videos[0].totalItems > 50) {
    totalPages = Math.round(videos[0].totalItems / 50);
  }
  if (t411.gui.current_page === 1) {
      if (t411.searchType === 'search') {
        t411.gui.init_pagination(totalItems,50,false,true,totalPages);
      } else {
        t411.gui.init_pagination(100,100,true,true,1);
      }
      $("#pagination").show();
  } else {
	if (t411.searchType !== 'search') {
		t411.gui.init_pagination(0,50,false,true,0);
	} else {
		t411.gui.init_pagination(totalItems,50,true,true,totalPages);
	}	
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="t411_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		$.get('http:'+video.link,function(res) {
        video.id = ((Math.random() * 1e6) | 0);
        try {
            var img = $($('article',res).find('img')[0]).attr('src');
        } catch(err) {
            var img = "images/T411.png";
        }
        var html = '<li class="list-row" style="margin:0;padding:0;"> \
            <div class="mvthumb"> \
        		  <img src="'+img+'" style="float:left;width:100px;height:100px;" /> \
        		</div> \
            <div style="margin: 0 0 0 105px;padding-top:10px;"> \
        		  <p><a href="#" class="preload_t411_torrent" data="'+encodeURIComponent(JSON.stringify(video))+'" style="font-size:16px;font-weight:bold;">'+video.title+'</a><p> \
        		  <div> \
        		    <span><b>Taille:</b> '+video.size+' </span> \
        		    <span style="margin-left:50px;"><b>Sources:</b> '+video.seeders+' </span> \
        		  </div>  \
        		  <div id="torrent_'+video.id+'"> \
        				<a class="open_in_browser" title="'+("Open in %s",t411.engine_name)+'" href="http:'+video.link+'"><img style="margin-top:8px;" src="images/export.png" /></a> \
        		  </div> \
        		</div> \
        	  </li>';
        		$("#t411_cont").append(html);
      });
	});
}


t411.loadSearchItems = function(listMain) {
    $('#items_container').empty().append('<ul id="t411_cont" class="list" style="margin:0;"></ul>');
    $.each(listMain,function(index1,data) {
      var img = $($('.bbc_img',data)[0]).attr('src');
      var list = $('a.bbc_link',data);
      var item = {};
      //item.title = $($('span.bbc_color',data)[0]).text(); 
      item.id=((Math.random() * 1e6) | 0);
      item.itemId = 't411_item_'+item.id;
      item.title = $($('h5 a',data)[1]).text();
      var section = $($('h5 a',data)[0]).text();
      item.link = $($('h5 a',data)[1]).attr('href').match(/(.*?).msg/)[0].replace('.msg','');
      if (in_array(section,sectionsList) !== -1) {
          t411.addContainer(item);
      }
    });
}

t411.search_type_changed = function() {
    t411.searchType = $("#searchTypes_select option:selected").val();
    if (t411.searchType === 'top100') {
        $('#video_search_query').prop('disabled', true);
        $('#orderBy_label').hide();
        $('#orderBy_select').hide();
        $('#video_search_btn').click();
    } else { 
       $('#video_search_query').prop('disabled', false);
       $('#orderBy_label').show();
       $('#orderBy_select').show();
    }
}

t411.printSingleItem = function(item) {
  try {
    $('#loading').hide();
    $("#loading p").empty().append("Loading videos...");
    $("#search").show();
    $("#items_container").show();
    var elem = item[0];
    var html = '<div class="youtube_item"> \
              <div class="left"> \
                <img src="'+elem.thumbnail+'" class="video_thumbnail"> \
                <a href="#" data="'+encodeURIComponent(JSON.stringify(elem))+'" class="play"> \
                <img src="images/play-overlay.png" class="overlay" style="top: 10px;margin-left: -10px;"/> \
                </a>\
              </div> \
              <div style="position: relative;overflow:auto;margin-left:5px;"> \
                <div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
                  <span style="display:none;" class="video_length"></span> \
                  <div style="margin-right:120px;"> \
                    <p> \
                      <a href="#" class="play" data="'+encodeURIComponent(JSON.stringify(elem))+'"> \
                        <b>'+elem.title+'</b> \
                      </a> \
                    </p> \
                  </div> \
                  <div> \
					<span><b>Taille:</b> '+video.size+' </span> \
					<span><b>Sources:</b> '+video.seeds+' </span> \
				  </div>  \
                </div> \
                <a class="open_in_browser" alt="'+_("Open in t411")+'" title="'+_("Open in t411")+'" href="'+elem.baseLink+'"> \
                  <img style="margin-left:5px;" src="images/export.png"> \
                </a> \
                <a id="reportLink" style="display:none;" href="'+elem.reportLink+'"></a> \
                <a href="#" data="'+encodeURIComponent(JSON.stringify(elem))+'" title="'+ _("Download")+'" class="download_megafile"><img src="images/down_arrow.png" width="16" height="16" /><span style="position:relative;top:-4px;">'+ _("Download")+'</span></a> \
              </div> \
            </div>';
      if ($('#'+elem.id).length !== 0) {
            $('#'+elem.id).empty().append(html);
      } else {
          $('#items_container').append(html);
      }
    }catch(err) {
      console.log('printSinglePageItem error: ' + err);
    }
}


function in_array(needle, haystack){
    var found = 0;
    for (var i=0, len=haystack.length;i<len;i++) {
        if (haystack[i] == needle) return i;
            found++;
    }
    return -1;
}

function d64(s) {
s += '=='.substr((2-s.length*3)&3)
s = s.replace(/-/g,'+').replace(/_/g,'/').replace(/,/g,'')
return new Buffer(s, 'base64')
}

function from256to128(s) {
  var o = new Buffer(16)
  for (var i = 0; i < 16; i++) {
    o[i] = s[i] ^ s[i + 16]
  }
  return o
}

function decrypter(maCleDeCryptage, maChaineCrypter){
  maCleDeCryptage = node_crypto.createHash('md5').update(maCleDeCryptage).digest("hex");
  letter = -1;
  newstr = '';
  maChaineCrypter = base64_decode(maChaineCrypter);
  strlen = maChaineCrypter.length;
  for ( i = 0; i < strlen; i++ ) {
    letter+=1;
    if ( letter > 31 ){
      letter = 0;
    }
    neword = ord(maChaineCrypter[i]) - ord(maCleDeCryptage[letter]);
    if ( neword < 1 ){
      neword += 256;
    }
    //console.log(neword)
    newstr += chr(neword);
    
    if(i+1 == strlen) {
      return newstr;
    }
  }
}


function chr(n) {
    return String.fromCharCode(n);
}

function ord(ch) {
    //console.log("ask: "+ch +" return: " + ch.charCodeAt(0))
    return ch.charCodeAt(0);
}

function base64_decode(data) {
  //  discuss at: http://phpjs.org/functions/base64_decode/
  // original by: Tyler Akins (http://rumkin.com)
  // improved by: Thunder.m
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //    input by: Aman Gupta
  //    input by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: Onno Marsman
  // bugfixed by: Pellentesque Malesuada
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //   example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: base64_decode('YQ===');
  //   returns 2: 'a'

  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
    ac = 0,
    dec = '',
    tmp_arr = [];

  if (!data) {
    return data;
  }

  data += '';

  do { // unpack four hexets into three octets using index points in b64
    h1 = b64.indexOf(data.charAt(i++));
    h2 = b64.indexOf(data.charAt(i++));
    h3 = b64.indexOf(data.charAt(i++));
    h4 = b64.indexOf(data.charAt(i++));

    bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

    o1 = bits >> 16 & 0xff;
    o2 = bits >> 8 & 0xff;
    o3 = bits & 0xff;

    if (h3 == 64) {
      tmp_arr[ac++] = String.fromCharCode(o1);
    } else if (h4 == 64) {
      tmp_arr[ac++] = String.fromCharCode(o1, o2);
    } else {
      tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
    }
  } while (i < data.length);

  dec = tmp_arr.join('');

  return dec.replace(/\0+$/, '');
}



module.exports = t411;
