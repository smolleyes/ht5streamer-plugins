/********************* engine name **************************/

var megaSearch = {};
megaSearch.engine_name = 'Mega-search';
megaSearch.initialized = false;

/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var i18n = require("i18n");
var nodemailer = require("nodemailer");
var _ = i18n.__;
var node_crypto = require('crypto');
var mega = require('mega');
var __ = require('underscore');

/****************************/

// global var
var has_more = true;
var gs_win;
var old_count = 0;
var sectionsList = new Array('VF','VO/VOST','Album Complet','OST / BO','Singles','Compilation Musical','VO/VOSTFR','Albums','Compilations Musicales','OST','Section Adulte (+18)','Films Adulte','Livres Adulte','BD Adulte','Films DVDRip & BDRip','Films VO & VOSTFR','Films TS, R5, Cam, DVDScreen','Films HD 720p, 1080p, 3D','Films HD 720p, 1080p, 3D.','Séries TV','Dessins animés','Documentaires, Spectacles, Concerts, Émissions TV, Sports','Musique','Musique HQ / Flac','Clips Musicaux','Manga','Drama','Section ADULTE','Romans, Livres','Presse, Magazine','Bande dessinée', 'Romans','Livres','Livres Audio');
var scannedLinks = 0;
var totalFiles = 0;
var folderList = [];
var linksList = [];
var maCleDeCryptage = "Sr95tYU1";

megaSearch.init = function(gui,ht5,notif) {
  megaSearch.mainWin = gui;
	megaSearch.gui = ht5;
  megaSearch.notif = notif;
  megaSearch.page;
  megaSearch.ignore_section = false;
  // create reusable transport method (opens pool of SMTP connections)
  var smtpTransport = nodemailer.createTransport("SMTP",{
      service: "Gmail",
      auth: {
          user: ht5.settings.gmailUser,
          pass: ht5.settings.gmailPass
      }
  });
  
  if (megaSearch.initialized === false ) {
    $('#items_container').empty()
    //load page
    $.get('http://forum.mega-search.ws/index.php',function(res){
        if ($('input[value="Identifiez-vous"]',res).length === 1) {
          megaSearch.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Please login to the website with the Always connected option checked then close the window to continue... !"),btnId:'showPage',btnTitle:_('Ok'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'});
          $('#showPage').click(function(e) {
              e.preventDefault();
              megaSearch.page = megaSearch.mainWin.Window.open('http://forum.mega-search.ws/index.php?action=login', {
                    "position":"center",
                    "width": 880,
                    "height": 800,
                    "show": true
              });
              megaSearch.page.on('loaded', function(){
                console.log('page loaded')
                loadMenus();
                if ($('#searchFilters_select option').length === 0) {
                  $('#searchFilters_select').empty();
                  $.get('http://forum.mega-search.ws/index.php?action=search',function(res) { 
                   var list = $('li.board',res);
                   $('#searchFilters_select').append('<option value="all">'+_("All category")+'</option>');
                   $.each(list,function(index,text){
                     var title = $(this).find("label").text();
                     var name = $(this).find('input').attr('name');
                     var value = $(this).find('input').attr('value');
                     $('#searchFilters_select').append('<option value="'+value+'">'+title+'</option>');
                   });
                 });
                }
              });
              megaSearch.page.on('close', function() {
                this.hide();
                this.close(true);
                megaSearch.initialized = true;
                $('#search').show();
                $("#search_results").empty().append('<p>'+_("Mega-search engine loaded successfully...")+'</p>');
                megaSearch.loadMenus();
              });
          });
        // si resélection du plugin
        } else if ($('#categories_select option').length === 0) {
            megaSearch.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("forum.mega-search.ws connexion ok !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
            $('#search').show();
            $("#search_results").empty().append('<p>'+_("Mega-search engine loaded successfully...")+'</p>');
            megaSearch.loadMenus();
            megaSearch.initialized = true;
        } else {
            megaSearch.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("forum.mega-search.ws connexion ok !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
            $('#search').show();
            $("#search_results").empty().append('<p>'+_("Mega-search engine loaded successfully...")+'</p>');
            megaSearch.initialized = true;
        }
    });
}
  
  // load engine
	loadEngine();
	
  $(ht5.document).off('click','.loadItem');
  $(ht5.document).on('click','.loadItem',function(e){
    e.preventDefault();
    try {
      var scannedLinks= [];
      var item = JSON.parse(decodeURIComponent($(this).attr("data")));
      try {
      $('#sublist_'+item.id).parent().parent().find('.loadItem').toggleClass('loadItem','false');
      $('#toggle_'+item.id).toggleClass('loadItem','false');
      // si sublist contient deja des items, on sort
      if ($('#sublist_'+item.id+' div').length > 0) {
        if ($('#sublist_'+item.id).parent().parent().find('.closed').length === 0) {
          $('#sublist_'+item.id).parent().parent().find('a.toggle-control-link')[0].click();
        }
        return;
      // sinon continue
      } else {
          $('#'+item.id).find('.showSpinner').show();
          if ($('#sublist_'+item.id).parent().parent().find('.closed').length === 0) {
            $('#sublist_'+item.id).parent().parent().find('a.toggle-control-link')[0].click();
          }
      }
      } catch(err) {
        console.log(err);
      }
      
      // recupere liens de la page de presentation
      $.get(item.link,function(res) {
        try {
			var img;
			try {
				img = $('.bbc_table img.resized',res)[0].src;
			} catch(err) {
				try {
					img = $('.bbc_table img', res)[0].src;
				} catch(err) {
					img = $('.bbc_img.resized', res).last().attr('src');
				}
			}
          item.thumbnail = img;
          item.baseLink = item.link;
          item.reportLink = $($('.reportlinks a',res)[0]).attr('href');
          var list = $('a.bbc_link',res);
          var table;
          var infosSup = '';
          try {
            table = $($('.bbc_table td', res)[4]).html().match(/(.*)Lien MEGA(.*?)</)[1];
          } catch(err) {
              try{
                table = $($('.bbc_table td', res)[4]).html();
                if(table=== "") {
                    try {
                      table = $($('.bbc_table td', res)[6]).html();
                      var c = $($('.bbc_table td',res)).length - 7;
                      infosSup = $($('.bbc_table td',res)[c]).html()+'<br/><br/>';
                    } catch(err) {
                        console.log('erreur recup fiche...');
                    }
                }
              } catch(err) {
                console.log('erreur recup fiche...');
              }
          }
          var thxBtn = '';
          try {
            thxBtn = $($('a[id*="buttonThx"]',res)[1]).parent().html().replace('href=','target="_blank" href=');
          } catch(err) {
              console.log("Merci déjà envoyé...")
          }
          var folderLinks = $('.bbc_table', res).html().toLowerCase().match(/lien dossier/g);
          var hasFolderlink = false;
          var hasFolderLinkCount = 0;
          if (folderLinks !== null) {
                console.log('liens dossier detecte...');
                hasFolderlink = true;
                hasFolderLinkCount = folderLinks.length;
          } 
          $.each(list,function(index,link) {
            var l = $(this).attr('href');
            if(l.indexOf('http://curl.mega-search.ws/') !== -1 && l.indexOf('http://curl.mega-search.ws/stream.php') === -1 ) {
                scannedLinks.push(l);
            } else if (l.indexOf('http://v.gd/') !== -1) {
                scannedLinks.push(l);
            } else if (l.indexOf('http://megacrypter.com/') !== -1) {
                scannedLinks.push(l);
            } else if (l.indexOf('https://mega.co.nz/#!') !== -1) {
                scannedLinks.push(l);
            } else {
                console.log('Lien inconnu....');
            }
            if (index+1 === list.length){
              megaSearch.totalLinks = scannedLinks.length;
              if((hasFolderlink === true) && (megaSearch.totalLinks > hasFolderLinkCount)){
                    megaSearch.totalLinks -= hasFolderLinkCount;
              }
              console.log('TOTAL LINKS FOUND:' + megaSearch.totalLinks);
              if (megaSearch.totalLinks === 0) {
                  $('#'+item.id).find('.showSpinner').hide();
                  $($('#'+item.id+' b')[0]).empty().html(_('No download links available...'));
                  return;
              } else {
                $('#fbxMsg').empty().remove();
                $('.mejs-overlay-button').hide();
                
                $('.mejs-container').append('<div id="fbxMsg"><a href="#" id="closePreview" alt="'+_("Close preview")+'" title="'+_("Close preview")+'">X</a><img style="heigth:400px;width:200px;float:left;margin-top:10px;margin-right:10px;" src="'+img+'" />'+table+''+infosSup+''+thxBtn+'</div>');
                $('#fbxMsg').hide().fadeIn(2000);
                if (megaSearch.totalLinks > 1 || hasFolderlink) {
					loadPageLinks(scannedLinks,item,megaSearch.totalLinks,true);
				} else {
					loadPageLinks(scannedLinks,item,megaSearch.totalLinks,false);
				}
              }
            }
          });
        } catch(err) {
            console.log('Get item page error:' + err);
            $('#'+item.id).find('.showSpinner').hide();
			$('#toggle_'+item.id).addClass('loadItem');
        }
      });
    } catch(err) {
        console.log('loadItem error: ' + err);
        $('#'+item.id).find('.showSpinner').hide();
		$('#toggle_'+item.id).addClass('loadItem');
    }
  });
        
  $(ht5.document).off('click','.play');
  $(ht5.document).on('click','.play',function(e){
    e.preventDefault();
    console.log('play clicked')
    $(".mejs-overlay").show();
		$(".mejs-layer").show();
		$(".mejs-overlay-play").hide();
		$(".mejs-overlay-loading").show();
		$('.highlight').toggleClass('highlight','false');
		$(this).closest('.youtube_item').toggleClass('highlight','true');
    var p = $('.highlight').position().top;
    $('#left-component').scrollTop(p+13);
		var item = JSON.parse(decodeURIComponent($(this).attr("data")));
    var stream = {};
		stream.title = item.title;
    if (item.key !== undefined){
      stream.link = 'http://'+megaSearch.gui.ipaddress+':8888/?file='+encodeURIComponent(item.link)+'&key='+encodeURIComponent(item.key)+'&size='+item.size;
    } else {
      stream.link = 'http://'+megaSearch.gui.ipaddress+':8888/?file='+encodeURIComponent(item.link); 
    }
    megaSearch.gui.startPlay(stream);
  });
  
  $(ht5.document).off('click','.download_megafile');
  $(ht5.document).on('click','.download_megafile',function(e){
    e.preventDefault();
		$('.highlight').toggleClass('highlight','false');
		$(this).closest('.youtube_item').toggleClass('highlight','true');
    var p = $('.highlight').position().top;
    $('#left-component').scrollTop(p+13);
		var item = JSON.parse(decodeURIComponent($(this).attr("data")));
    var stream = {};
		stream.title = item.title;
    if (item.key !== undefined){
      stream.link = 'http://'+megaSearch.gui.ipaddress+':8888/?file='+encodeURIComponent(item.link)+'&key='+encodeURIComponent(item.key)+'&size='+item.size+'&download';
    } else {
      stream.link = 'http://'+megaSearch.gui.ipaddress+':8888/?file='+encodeURIComponent(item.link)+'&download'; 
    }
    megaSearch.gui.startPlay(stream);
  });
  
}

function loadPageLinks(list,item,totalLinks,loadInSub) {
  var i=0;
  scannedLinks= 0;
  totalFiles = 0;
  failedFiles = 0;
  linksList = [];
  folderList = [];
  $.each(list,function(index,link) {
    try {
      if(link.indexOf('http://curl.mega-search.ws') !== -1) {
        var titre = $(this).prev().text();
        if ((titre == undefined) || (titre == '')) {
            titre = item.title;
        }
        $.get(link,function(res){
          try {
            var titre = $('td.mega',res).text().replace('Fichier MEGA:','').trim().match(/(.*?)Taille/)[1];
          } catch(err) {
            var titre = undefined;
          }
		  var code = base64_decode(res.match(/id="code"(.*?)>(.*?)<\/div>/)[2]);
          var megaLink = decrypter(maCleDeCryptage,code);
			if (megaLink.match(/https:\/\/mega.co.nz\/#F!/) !== null) {
				loadInSub = true;
				getFolderLinks(megaLink,item,linksList,totalLinks,i,loadInSub);
			} else {
				if ((titre === '') || (titre == undefined) || (titre === "titre inconnu...")) {
					mega.file(megaLink).loadAttributes(function(err, file) {
						console.log(file)
						if(err || file === undefined) {
							linksList[i] = {};
							linksList[i]['thumbnail'] = item.thumbnail;
							linksList[i]['link'] = megaLink;
							linksList[i]['itemId'] = item.itemId;
							linksList[i]['id'] = item.id;
							linksList[i]['baseLink'] = item.link;
							linksList[i]['reportLink'] = item.reportLink;
							linksList[i]['title'] = 'Impossible de décoder ce fichier';
							i+=1;
							if (index+1 === totalLinks){
								var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
								$('#'+item.id).find('.showSpinner').hide();
								$('#toggle_'+item.id).addClass('loadItem');
							  if (totalLinks.length > 1 || loadInSub) {
								  console.log("print multi:" + links)
								  megaSearch.printMultiItem(links);
								  $('#sublist_'+item.id).parent().parent().show();
							  } else {
								  console.log("print single:" + links)
								  megaSearch.printSingleItem(links);
							  }
							}
						} else {
							linksList[i] = {};
							linksList[i]['thumbnail'] = item.thumbnail;
							linksList[i]['link'] = megaLink;
							linksList[i]['itemId'] = item.itemId;
							linksList[i]['id'] = item.id;
							linksList[i]['baseLink'] = item.link;
							linksList[i]['reportLink'] = item.reportLink;
							linksList[i]['title'] = file.name;
							i+=1;
							if (index+1 === totalLinks){
								var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
								$('#'+item.id).find('.showSpinner').hide();
								$('#toggle_'+item.id).addClass('loadItem');
							  if (linksList.length > 1 || loadInSub) {
								  megaSearch.printMultiItem(links);
								  $('#sublist_'+item.id).parent().parent().show();
							  } else {
								   console.log("print single:" + links)
								  megaSearch.printSingleItem(links);
							  }
							}
						}
					});
				} else {
					linksList[i] = {};
					linksList[i]['thumbnail'] = item.thumbnail;
					linksList[i]['link'] = megaLink;
					linksList[i]['itemId'] = item.itemId;
					linksList[i]['id'] = item.id;
					linksList[i]['baseLink'] = item.link;
					linksList[i]['reportLink'] = item.reportLink;
					linksList[i]['title'] = titre;
					i+=1;
					if (index+1 === totalLinks){
						var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
						$('#'+item.id).find('.showSpinner').hide();
						$('#toggle_'+item.id).addClass('loadItem');
					  if (totalLinks.length > 1 || loadInSub) {
						  console.log("print multi:" + links)
						  megaSearch.printMultiItem(links);
						  $('#sublist_'+item.id).parent().parent().show();
					  } else {
						  console.log("print single:" + links)
						  megaSearch.printSingleItem(links);
					  }
					}
				}
			}
		});
			
      //lien vd
      } else if (link.indexOf('http://v.gd') !== -1) {
        console.log('Lien v.gd ' + link);
        var titre = $(this).prev().text();
        if ((titre == undefined) || (titre == '')) {
            titre = item.title;
        }
        $.ajax({
            type: 'GET',
            url: link,
            dataType: "text",
            success: function (result) {
              var megaLink = $('.biglink',result).text();
              if (megaLink.match(/https:\/\/mega.co.nz\/#F!/) !== null) {
				  loadInSub = true;
                  getFolderLinks(megaLink,item,linksList,totalLinks,i,loadInSub);
              }
              linksList[i] = {};
              linksList[i]['title'] = titre;
              linksList[i]['thumbnail'] = item.thumbnail;
              linksList[i]['link'] = $('.biglink',result).text();
              linksList[i]['itemId'] = item.itemId;
              linksList[i]['id'] = item.id;
              linksList[i]['baseLink'] = item.link;
              linksList[i]['reportLink'] = item.reportLink;
              i+=1;
              if (index+1 === totalLinks){
					var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
					$('#'+item.id).find('.showSpinner').hide();
					$('#toggle_'+item.id).addClass('loadItem');
				  if (totalLinks.length > 1 || loadInSub) {
					  megaSearch.printMultiItem(links);
					  $('#sublist_'+item.id).parent().parent().show();
				  } else {
					  console.log("print single:" + links)
					  megaSearch.printSingleItem(links);
				  }
			  }
            }
        });
      //lien megacrypter
      } else if (link.indexOf('http://megacrypter.com') !== -1) {
        console.log('Lien megacrypter ' + link);
        getMegacrypterInfos(link,i,index,totalLinks,linksList,item,loadInSub);
        i+=1;
      //lien mega.co
      } else if (link.indexOf('https://mega.co.nz/#!') !== -1) {
        console.log('Lien mega.co ' + link);
        var titre= $(this).prev().text();
        if ((titre == undefined) || (titre == '')) {
            titre = item.title;
        }
        if (link.match(/https:\/\/mega.co.nz\/#F!/) !== null) {
			loadInSub = true;
            getFolderLinks(link,item,linksList,totalLinks,i,loadInSub);
        }
        linksList[i] = {};
        linksList[i]['title'] = titre;
        linksList[i]['thumbnail'] = item.thumbnail;
        linksList[i]['link'] = link;
        linksList[i]['itemId'] = item.itemId;
        linksList[i]['id'] = item.id;
        linksList[i]['baseLink'] = item.link;
        linksList[i]['reportLink'] = item.reportLink;
        i+=1;
        if (index+1 === totalLinks){
			var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
			$('#'+item.id).find('.showSpinner').hide();
			$('#toggle_'+item.id).addClass('loadItem');
		  if (totalLinks.length > 1 || loadInSub) {
			  megaSearch.printMultiItem(links);
			  $('#sublist_'+item.id).parent().parent().show();
		  } else {
			  console.log("print single:" + links)
			  megaSearch.printSingleItem(links);
		  }
		}
      }
    } catch(err) {
      console.log('loadPageLinks error: ' + err);
      $('#'+item.id).find('.showSpinner').hide();
	  $('#toggle_'+item.id).addClass('loadItem');
    }
  });
}

function decodeName(at) {
  // remove empty bytes from end
  var end = at.length
  while (!at.readUInt8(end - 1)) end--

  at = at.slice(0, end).toString()
  if (at.substr(0,6) !== 'MEGA{"') {
    throw new Error('Attributes could not be decrypted with provided key.')
  }

  var obj = JSON.parse(at.substring(4));
  return obj.n;
}

function getFolderLinks(megaLink,item,linksList,totalLinks,i,loadInSub) {
    var folderId = megaLink.match(/(.*)#F!(.*?)!/)[2];
    var k0 = d64(megaLink.match(/(.*)#F!(.*?)!(.*)/)[3]);
    var iv = Buffer(16);
    iv.fill(0);
    $.post('https://g.api.mega.co.nz/cs?id=1&n='+folderId+'','[{"a":"f","c":"1","r":"1"}]').done(function(res) {
      scannedLinks +=1;
      var listing = {}; 
      listing.folder = {};
      listing.folder.files = [];
      $.each(res,function(mainIndex,mainObj){
          if (typeof(mainObj) === "object") {
            $.each(mainObj,function(ind,obj){
                $.each(obj,function(fileIndex,file){ 
                  if(typeof(obj) === "object") {
                    if (file.t === 1) {
                      // decrypt folder
                      var k = d64(file.k.split(':')[1]);
                      var a = d64(file.a);
                      var aes = node_crypto.createDecipheriv('aes-128-ecb', k0, Buffer(0));
                      aes.setAutoPadding(false);
                      var kdec = aes.update(k);
                      aes = node_crypto.createDecipheriv('aes-128-cbc', kdec, iv);
                      aes.setAutoPadding(false);
                      
                      var name = decodeName(aes.update(a));
                      listing.folder.name = name;
                      listing.folder.key = kdec.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
                    } else {
                      var folderFile = {};
                      var k = d64(file.k.split(':')[1]);
                      var a = d64(file.a);
                      
                      var aes = node_crypto.createDecipheriv('aes-128-ecb', k0, Buffer(0));
                      aes.setAutoPadding(false);
                      var kfdec = aes.update(k).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
                      var k2dec = from256to128(aes.update(k));
                      
                      aes = node_crypto.createDecipheriv('aes-128-cbc', k2dec, iv);
                      aes.setAutoPadding(false);
                      var name = decodeName(aes.update(a));
                      folderFile.name = name;
                      if(name.indexOf('.txt') === -1) {
                        folderFile.id = file.h;
                        folderFile.folderId = folderId;
                        folderFile.k = kfdec;
                        folderFile.size = file.s;
                        listing.folder.files.push(folderFile);
                        totalFiles += 1;
                      }
                    }
                    if(fileIndex+1 === obj.length) {
                        folderList.push(listing);
                        if(scannedLinks === totalLinks) {
                          // add files to total listing
                          $.each(folderList,function(mainDirIndex,mainDir) {
                              $.each(mainDir.folder.files,function(fileIndex,file) {
                                  getMegaFolderLink(file,i,mainIndex,totalFiles,linksList,item,loadInSub);
                                  i+=1;
                              });
                          });
                        }
                    }
                  }
              });
          });
        }
      });
    }).fail(function(error) {
		console.log("getFolderLinks error"+ error)
        $('#toggle_'+item.id).addClass('loadItem');
        $('#'+item.id).find('.showSpinner').hide();
    });
}

function getMegaFolderLink(file,i,index,total,linksList,item,loadInSub) {
    $.post('https://eu.api.mega.co.nz/cs?id=1&n='+file.folderId+'','[{"a":"g","g":1,"ssl":1,"n":"'+file.id+'"}]').done(function(res) {
      linksList[i] = {};
      linksList[i]['title'] = file.name.replace(',c','');
      linksList[i]['thumbnail'] = item.thumbnail;
      linksList[i]['size'] = file.size;
      linksList[i]['key'] = file.k;
      linksList[i]['itemId'] = item.itemId;
      linksList[i]['id'] = item.id;
      linksList[i]['baseLink'] = item.baseLink;
      linksList[i]['reportLink'] = item.reportLink;
      linksList[i]['link'] = res[0].g;
      if (total === linksList.length){
		var links = __.sortBy(linksList, function(obj){ return parseInt(obj.title) });
        if (total.length > 1 || loadInSub) {
            megaSearch.printMultiItem(links);
            $('#sublist_'+item.id).parent().parent().show();
        } else {
			console.log("print single:" + links)
            megaSearch.printSingleItem(links);
        }
      }
    }).fail(function(error) {
		console.log("getMegaFolderLink error"+ error)
        $('#toggle_'+item.id).addClass('loadItem');
        $('#'+item.id).find('.showSpinner').hide();
    });
}

function getMegacrypterInfos(link,i,index,total,linksList,item,loadInSub) {
    var param = {"m": "dl", "link": link};
    var paramString = JSON.stringify(param);
    
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': paramString.length,
        'Referer': 'http://forum.mega-search.ws/'
    };
    
    var options = {
        host: 'megacrypter.com',
        port: 80,
        path: '/api',
        method: 'POST',
        headers: headers
    };
    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            if (resultObject.error !== undefined) {
                console.log("ERREUR "+resultObject.error);
            } else {
              linksList[i] = {};
              linksList[i]['link'] = resultObject.url;
              linksList[i]['reportLink'] = item.reportLink;
              getMegacrypterLink(link,i,index,total,linksList,item,loadInSub);
            }
        });
    });
    req.write(paramString);
    req.end();
}

function getMegacrypterLink(link,i,index,total,linksList,item,loadInSub) {
    var param = {"m": "info", "link": link};
    var paramString = JSON.stringify(param);
    
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': paramString.length,
        'Referer': 'http://forum.mega-search.ws/'
    };
    
    var options = {
        host: 'megacrypter.com',
        port: 80,
        path: '/api',
        method: 'POST',
        headers: headers
    };
    
    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            if (resultObject.error !== undefined) {
                console.log("ERREUR "+resultObject.error);
            } else {
              linksList[i]['title'] = resultObject.name;
              linksList[i]['thumbnail'] = item.thumbnail;
              linksList[i]['size'] = resultObject.size;
              linksList[i]['key'] = resultObject.key;
              linksList[i]['itemId'] = item.itemId;
              linksList[i]['id'] = item.id;
              linksList[i]['baseLink'] = item.link;
              if (index+1 === total){
                if (linksList.length > 1 || loadInSub) {
                    megaSearch.printMultiItem(linksList);
                    $('#sublist_'+item.id).parent().parent().show();
                } else {
					console.log("print single:" + links)
                    megaSearch.printSingleItem(linksList);
                }
              }
            }
        });
    });
    req.write(paramString);
    req.end();
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr', 'es'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: megaSearch.gui.pluginsDir + 'mega-search/locales',
    updateFiles: true
});
if ($.inArray(megaSearch.gui.settings.locale, localeList) >-1) {
	console.log('Loading Mega-search engine with locale' + megaSearch.gui.settings.locale);
	i18n.setLocale(megaSearch.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
megaSearch.menuEntries = ["searchTypes","searchFilters"];
megaSearch.defaultMenus = ["searchTypes","categories","searchFilters"];
// searchTypes menus and default entry
megaSearch.searchTypes = JSON.parse('{"'+_("Search")+'":"search","'+_("Browse")+'":"browse"}');
megaSearch.defaultSearchType = 'search';
//megaSearch.search_type_changed();

}

megaSearch.loadMenus = function() {
    var sublist = [];
    var i = 0;
    scanSublist = false;
    $.get('http://forum.mega-search.ws/index.php',function(res){
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
                }
                //if (l.length === index+1) {
                    //megaSearch.search_type_changed();
                //}
              });
            }
          });
        }
      });
    });
}

megaSearch.search = function(query,options) {
	megaSearch.currentSearch = query;
  if (megaSearch.searchType === 'browse') {
      var page = parseInt(options.currentPage - 1) * 25;
      var section = $("#categories_select option:selected").val().split('::')[1];
      var currPage = section.match(/board=(.*?)\.(.*)/)[2];
      var link = section.replace('.'+currPage,'.'+page);
    $.get(link,function(res){
      var totalPages = $('.pagelinks a',res).last().text();
      var list = $('td.subject.windowbg2',res);
      var links = [];
      if (list.length === 0 ){
           $('#loading').hide();
           $('#search').show();
           $('#pagination').hide();
           $("#search_results").empty().append(_('<p>No results found...</p>'));
      }
      $.each(list,function(index,name){
        links[index] = {};
        links[index]['title'] = $(this).text().replace(/(\r\n|\n|\r)/gm,"").trim().match(/(.*?)Démarré/)[1];
        links[index]['link'] = $(this).find('a').attr('href');
        links[index]['id'] = links[index]['link'].match(/(.*?)topic=(.*)/)[2];
        if (index+1 === list.length) {
            megaSearch.printPageItems(links,totalPages);
        }
      });
   });
  } else {
    if (query !== '') {
        if (options.searchFilter === 'all') {
        var param = {advanced: 1, search: query, searchtype: 2, userspec: '*',sort: 'relevance|desc',show_complete: 1,minage:0,maxage:9999,acctopic:'',topic_search:1,match_mode:'smart'};
      } else {
        var param = JSON.parse('{"search":"'+query+'","searchtype":"2","match_mode":"smart","search_selection":"thisbrd","userspec":"","show_complete":"1","subject_only":"0","minage":"0","maxage":"9999","sort":"relevance","acttopic":"0","actbrd":"0","brd['+options.searchFilter+']":"'+options.searchFilter+'"}')
      }
        var method = NaN;
        $('#loading').show();
        $('#search').hide();
        var link;
        if (options.currentPage === 1) {
          link = "http://forum.mega-search.ws/index.php?action=search2";
          var method =  $.post;
        } else {
          megaSearch.currPageStart = (options.currentPage - 1) * 30;
          link = "http://forum.mega-search.ws/index.php?action=search2;"+megaSearch.params+';start='+megaSearch.currPageStart;
          var method = $.get;
        }
        method(link, param).done(function( res ) {
          //check solo page or multi
          var listMain = $('.topic_details',res);
          if (options.currentPage === 1) {
            try {
              megaSearch.totalPages = $('a.navPages',res).last().text();
              pageParams = $('a.navPages',res).last().attr('href');
              var params = pageParams.split(';');
              megaSearch.params = params[2];
              megaSearch.currPageStart = 0;
              megaSearch.totalResults = parseInt(params[params.length - 1].replace('start=','')) + 30;
              if (megaSearch.totalPages > 0){
                megaSearch.gui.init_pagination(megaSearch.totalResults,30,true,true,megaSearch.totalPages);
                $("#pagination").show();
              }
              megaSearch.loadSearchItems(listMain);
            } catch(err) {
              console.log(err);
              megaSearch.totalPages = 1;
              if(listMain.length === 0) {
                 $('#loading').hide();
                 $('#search').show();
                 $('#pagination').hide();
                 $("#search_results").empty().append(_('<p>No results found...</p>'));
                 return;
              }
              megaSearch.totalResults = listMain.length;
              megaSearch.gui.init_pagination(megaSearch.totalResults,30,true,true,megaSearch.totalPages);
              $("#pagination").show();
              pageParams = '';
              megaSearch.loadSearchItems(listMain);
            }
          } else {
            if (megaSearch.totalPages > 0){
              megaSearch.gui.init_pagination(megaSearch.totalResults,30,true,true,megaSearch.totalPages);
              $("#pagination").show();
            }
            megaSearch.loadSearchItems(listMain);
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

megaSearch.loadSearchItems = function(listMain) {
    $('#items_container').empty().append('<ul id="megaSearch_cont" class="list" style="margin:0;"></ul>');
    $.each(listMain,function(index1,data) {
      var img = $($('.bbc_img',data)[0]).attr('src');
      var list = $('a.bbc_link',data);
      var item = {};
      //item.title = $($('span.bbc_color',data)[0]).text(); 
      item.id=((Math.random() * 1e6) | 0);
      item.itemId = 'megaSearch_item_'+item.id;
      item.title = $($('h5 a',data)[1]).text();
      var section = $($('h5 a',data)[0]).text();
      item.link = $($('h5 a',data)[1]).attr('href').match(/(.*?).msg/)[0].replace('.msg','');
      if (in_array(section,sectionsList) !== -1) {
          megaSearch.addContainer(item);
      }
    });
}

megaSearch.printPageItems = function(items,totalPages) {
    $('#items_container').empty().append('<ul id="megaSearch_cont" class="list" style="margin:0;"></ul>');
    $('#loading').hide();
    $('#search').show();
    $('#items_container').show();
    if ((totalPages !== undefined)){
        megaSearch.gui.init_pagination(0,40,true,true,0);
        $("#pagination").show();
    }
    $.each(items,function(index,link){
        link.id=((Math.random() * 1e6) | 0);
        link.itemId = 'megaSearch_item_'+link.id;
        var html = '<li class="youtube_item" id="'+link.id+'"> \
              <div class="left"> \
                <img src="images/mega-search.png" class="overlay-mini"> \
                <div id="fountainG" class="showSpinner">\
                <div id="fountainG_1" class="fountainG">\
                </div>\
                <div id="fountainG_2" class="fountainG">\
                </div>\
                <div id="fountainG_3" class="fountainG">\
                </div>\
                <div id="fountainG_4" class="fountainG">\
                </div>\
                <div id="fountainG_5" class="fountainG"> \
                </div> \
                <div id="fountainG_6" class="fountainG"> \
                </div> \
                <div id="fountainG_7" class="fountainG"> \
                </div>  \
                <div id="fountainG_8" class="fountainG"> \
                </div> \
              </div> \
              <div style="position: relative;overflow:auto;left:100px;"> \
                <div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
                  <span style="display:none;" class="video_length"></span> \
                  <div style="margin-right:120px;"> \
                    <p> \
                      <a id="toggle_'+link.id+'" class="loadItem" data="'+encodeURIComponent(JSON.stringify(link))+'"> \
                        <b>'+link.title+'</b> \
                      </a> \
                    </p> \
                  </div> \
                  <div> \
                    <span> \
                      <b> \
                    </span> \
                  </div> \
                </div> \
                <a class="open_in_browser" alt="'+_("Open in Mega-search")+'" title="'+_("Open in Mega-search")+'" href="'+link.link+'"> \
                  <img style="margin-left:5px;" src="images/export.png"> \
                </a> \
                <div id="'+link.itemId+'"> \
                </div> \
              </div> \
            </li> \
            <div class="toggle-control" style="display:none;">\
                <a href="#" class="toggle-control-link loadItem" alt="'+link.id+'::Mega-search" data="'+encodeURIComponent(JSON.stringify(link))+'">\+ '+_("Links")+'</a> \
                <div class="toggle-content" style="display:none;"> \
                  <div id="sublist_'+link.id+'"> \
                  </div> \
                </div>\
              </div>';
      $("#megaSearch_cont").append(html);
      $('.showSpinner').hide();
	});
}

megaSearch.addContainer = function(item) {
    var html = '<li class="youtube_item" id="'+item.id+'"> \
                  <div class="left"> \
                    <img src="images/mega-search.png" class="overlay-mini"> \
                    <div id="fountainG" class="showSpinner">\
                    <div id="fountainG_1" class="fountainG">\
                    </div>\
                    <div id="fountainG_2" class="fountainG">\
                    </div>\
                    <div id="fountainG_3" class="fountainG">\
                    </div>\
                    <div id="fountainG_4" class="fountainG">\
                    </div>\
                    <div id="fountainG_5" class="fountainG"> \
                    </div> \
                    <div id="fountainG_6" class="fountainG"> \
                    </div> \
                    <div id="fountainG_7" class="fountainG"> \
                    </div>  \
                    <div id="fountainG_8" class="fountainG"> \
                    </div> \
                  </div> \
                  <div style="position: relative;overflow:auto;left:100px;"> \
                    <div class="item_infos" style="position: relative;top: -10px;padding:0px 5px;"> \
                      <span style="display:none;" class="video_length"></span> \
                      <div style="margin-right:120px;"> \
                        <p> \
                          <a href="#" id="toggle_'+item.id+'" class="loadItem" data="'+encodeURIComponent(JSON.stringify(item))+'"> <b>'+item.title+'</b></a> \
                        </p> \
                      </div> \
                    </div> \
                    <a class="open_in_browser" alt="'+_("Open in Mega-search")+'" title="'+_("Open in Mega-search")+'" href="'+item.link+'"> \
                      <img style="margin-left:5px;" src="images/export.png"> \
                    </a> \
                  </div> \
              </li> \
              <div class="toggle-control" style="display:none;">\
                <a href="#" class="toggle-control-link loadItem" alt="'+item.id+'::Mega-search" data="'+encodeURIComponent(JSON.stringify(item))+'">\+ '+_("Links")+'</a> \
                <div class="toggle-content" style="display:none;"> \
                  <div id="sublist_'+item.id+'"> \
                  </div> \
                </div>\
              </div>';
  $("#megaSearch_cont").append(html).show();
  $("#items_container").show();
  $("#search").show();
  $("#pagination").show();
  $("#load").hide();
  $('#'+item.id).find('.showSpinner').hide();
}

megaSearch.search_type_changed = function() {
    megaSearch.searchType = $("#searchTypes_select option:selected").val();
    $('#categories_label').hide();
    $('#categories_select').hide();
    $('#searchFilters_label').hide();
    $('#searchFilters_select').hide();
    if (megaSearch.searchType === 'browse') {
        if ($('#categories_select option').length !== 0) {
          var val = $("#categories_select option:selected").val().split('::')[1];
          var name = $("#categories_select option:selected").val().split('::')[0];
          $('#video_search_query').prop('disabled', true);
          if ((val === '') || (val === undefined)) {
            $('#video_search_btn').prop('disabled', true);
            $("#search_results").empty().append(_('<p>Please select a sub-category...</p>'));
          } else {
            $("#search_results").empty().append("<p>"+_("Navigation in the %s section", name)+"</p>");
            $('#video_search_btn').prop('disabled', false);
          } 
        } else {
              megaSearch.loadMenus();
        }
        $('#categories_label').show();
        $('#categories_select').show();
    } else {
      if ($('#searchFilters_select option').length === 0) {
        $('#searchFilters_select').empty();
        $.get('http://forum.mega-search.ws/index.php?action=search',function(res) { 
         var list = $('li.board',res);
         $('#searchFilters_select').append('<option value="all">'+_("All category")+'</option>');
         $.each(list,function(index,text){
           var title = $(this).find("label").text();
           var name = $(this).find('input').attr('name');
           var value = $(this).find('input').attr('value');
           $('#searchFilters_select').append('<option value="'+value+'">'+title+'</option>');
         });
       });
      }
       $("#search_results").empty().append("<p>"+_("Searching mode...", name)+"</p>");
       $('#video_search_query').prop('disabled', false);
       $('#video_search_btn').prop('disabled', false);
       $('#searchFilters_label').show();
       $('#searchFilters_select').show();
    }
}

megaSearch.printSingleItem = function(item) {
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
                    <span> \
                      <b> \
                    </span> \
                  </div> \
                </div> \
                <a class="open_in_browser" alt="'+_("Open in Mega-search")+'" title="'+_("Open in Mega-search")+'" href="'+elem.baseLink+'"> \
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

megaSearch.printMultiItem = function(items) {
    $('#loading').hide();
    $("#loading p").empty().append("Loading videos...");
    $("#search").show();
    $("#items_container").show();
    var list = __.sortBy(items, function(o) { return o.title; })
    try {
      $('#'+list[0].id).find('.showSpinner').hide();
    } catch(err) {
        console.log(err,list);
    }
    $('#sublist_'+list[0].id).parent().parent().find('a').first().empty().html(_("Links"));
    $('#sublist_'+list[0].id).empty();
    $.each(list,function(index,elem) {
            if (index === 0) {
              var string = $('#sublist_'+elem.id).parent().parent().find('a').first().text();
              $('#sublist_'+elem.id).parent().parent().find('a').first().empty().html(string + ' ('+items.length+' '+_("links found")+')');
            }
            var html = '<div class="youtube_item"> \
                          <div class="left"> \
                              <img src="'+elem.thumbnail+'" class="video_thumbnail" /> \
                              <a href="#" data="'+encodeURIComponent(JSON.stringify(elem))+'" class="play"> \
                              <img src="images/play-overlay.png" class="overlay" style="top: 10px;margin-left: -10px;"/> \
                          </div> \
                          <div style="position: relative;overflow:auto;margin-left:5px;"> \
                            <div class="item_infos" style="position: relative;top: -10px;padding-left:5px;"> \
                              <span style="display:none;" class="video_length"></span> \
                              <div margin-right:130px;> \
                                <p> \
                                  <a href="#" class="play" data="'+encodeURIComponent(JSON.stringify(elem))+'"> \
                                    <b>'+elem.title+'</b> \
                                  </a> \
                                </p> \
                              </div> \
                              <div> \
                                <span> \
                                  <b> \
                                </span> \
                              </div> \
                            </div> \
                            <div id="'+elem.itemId+'"> \
                            </div> \
                            <a class="open_in_browser" alt="'+_("Open in Mega-search")+'" title="'+_("Open in Mega-search")+'" href="'+elem.baseLink+'"> \
                              <img style="margin-left:5px;" src="images/export.png"> \
                            </a> \
                            <a id="reportLink" style="display:none;" href="'+elem.reportLink+'"></a> \
                            <a href="#" data="'+encodeURIComponent(JSON.stringify(elem))+'" title="'+ _("Download")+'" class="download_megafile"><img src="images/down_arrow.png" width="16" height="16" /><span style="position:relative;top:-4px;">'+ _("Download")+'</span></a> \
                          </div> \
                        </div>';
          $('#sublist_'+elem.id).append(html);
      });
}

megaSearch.sendMail = function(name,url,reportLink) {
    // setup e-mail data with unicode symbols
    if (name.indexOf('dossier Mega') !== -1) {
        return;
    }
    var mailOptions = {
        from: "ht5bot", // sender address
        to: "max.faure54@gmx.fr,megapackapp@free.fr,s.lagui@gmail.com", // list of receivers
        subject: "Lien mort sur forum Mega-search", // Subject line
        text: "", // plaintext body
        html: "<b>Hello !</b><p>Un nouveau lien mort a été détecté par ht5streamer:<br>Lien fiche: <a href='"+url+"'>"+name+"</a><br>Lien Rapporter au moderateur: <a href='"+reportLink+"'>"+name+"</a><br><br>A vous de corriger :)<br><br>Smo</p>" // html body
    }
    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }
    });
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



module.exports = megaSearch;
