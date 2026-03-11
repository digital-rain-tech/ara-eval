$.fn.sliderX = function(opts) {
    var $o = $(this);
    var $inner = $o.find('.sliderInner'),
        $items = $inner.find('ul'),
        $item = $inner.find('li'),
        $prev = $o.find('.btn-prev'),
        $next = $o.find('.btn-next'),
        $tags = $o.find('.sliderCur'),
        $tag = $tags.find('a');
    var $txt = $o.find('.sliderTxt');
    var winWidth = $(window).width(),
        winHeight = $(window).height(),
        domWidth = $inner.width(),
        domHeight = $inner.height(),
        itemSize = $item.size(),
        cTime = 4500,
        sTime = 450,
        index = 0;
    var timer;

    var defaults = {
        itemWidth: domWidth, //一次横向移动像素
        tagCurClass: 'cur', //当前标签 添加 class
        cTime: cTime, //切换时间 change time
        sTime: sTime, //动画渲染时间 slider time
        playAuto: true, //默认是否执行动画
        imgAuto: false, //图片居中处理
        imgFill: false //图片填充DOM
    };

    var opts = $.extend(defaults, opts || {});

    var slider = {
        auto: function() {
            var _this = this;
            $items.width(itemSize * opts.itemWidth);
            $item.width(opts.itemWidth);

            // 图片 居中处理
            if (opts.imgAuto) {
                _this.imgAutoFn();
            }

            // 如果 默认执行动画 为true
            if (opts.playAuto) {
                this.startFn();
                $o.hover(function() {
                    _this.stopFn();
                }, function() {
                    _this.startFn();
                });
            }

            // 标签 绑定切换事件
            $tag.hover(function() {
                index = $(this).index();
                _this.goTo();
            }, function() {});

            // 下一张
            $next.click(function() {
                _this.nextFn();
            });

            // 上一张
            $prev.click(function() {
                _this.prevFn();
            });

            // $txt.find('a').attr('href', $item.eq(index).find('a').attr('href'));
            // $txt.find('a').html($item.eq(index).find('p').text());
        },
        imgAutoFn: function() {
            $item.each(function() {
                var $img = $(this).find('li:first');
                imgAuto($img);
            });

            function imgAuto($img) {
                var imgWidth = $img.width(),
                    imgHeight = $img.height();
                var img = new Image();
                var imgTimer;
                img.src = $img.attr('src');

                var c = {
                    auto: function() {
                        var _this = this;
                        imgTimer = window.setInterval(function() {
                            if (img.width != 0 || img.height != 0) {
                                window.clearInterval(imgTimer);
                                _this.imgAuto();
                            }
                        }, 20);
                    },
                    imgAuto: function() {
                        if (domWidth / domHeight > img.width / img.height) {
                            // 图片 填充
                            if (opts.imgFill) {
                                imgWidth = domWidth;
                                imgHeight = img.height * imgWidth / img.width;
                            } else {
                                imgHeight = domHeight;
                                imgWidth = img.width * imgHeight / img.height;
                            }
                        } else {
                            // 图片 填充
                            if (opts.imgFill) {
                                imgHeight = domHeight;
                                imgWidth = img.width * imgHeight / img.height;
                            } else {
                                imgWidth = domWidth;
                                imgHeight = img.height * imgWidth / img.width;
                            }
                        }

                        $img.css({
                            'width': imgWidth,
                            'height': imgHeight,
                            'marginLeft': (domWidth - imgWidth) / 2,
                            'marginTop': (domHeight - imgHeight) / 2
                        });
                    }
                };
                c.auto();
            }
        },
        startFn: function() {
            timer = window.setInterval(this.nextFn, opts.cTime);
        },
        stopFn: function() {
            window.clearInterval(timer);
        },
        nextFn: function() {
            var _this = slider;
            index++;
            if (index >= itemSize) {
                index = 0;
            }
            _this.goTo();
        },
        prevFn: function() {
            var _this = slider;
            index--;
            if (index < 0) {
                index = itemSize - 1;
            }
            _this.goTo();
        },
        goTo: function() {
            $items.stop(true).animate({
                'marginLeft': -index * opts.itemWidth
            }, opts.sTime, function() {
                if (!$tag.eq(index).hasClass(opts.tagCurClass)) {
                    $tag.removeClass(opts.tagCurClass).eq(index).addClass(opts.tagCurClass);
                }
                $txt.find('a').attr('href', $item.eq(index).find('a').attr('href'));
                $txt.find('a').html($item.eq(index).find('p').text());
            });
        }
    };

    slider.auto();
};
// 触屏横向滚动
$.fn.touchSliderX = function(opts) {
  var $o = $(this),
    $items = $o.find('.sliderInner ul'),
    $item = $o.find('.sliderInner li'),
    $cur = $o.find('.sliderCur'),
    $curItem = $cur.find('a');
  var $next = $o.find('.btn-next'),
    $prev = $o.find('.btn-prev');
  var domWidth = $o.width(),
    domHeight = $o.height(),
    startX, startY, x = 0,
    y = 0,
    s = $item.size(),
    index = 0,
    timer;

  var defaults = {
    movePx: 50,
    t: 4500,
    imgFill: false
  };

  var opts = $.extend(defaults, opts || {});

  var g = {
    init: function() {
      var _this = this;

      $items.width(domWidth * s);
      $item.css('width', domWidth);
      $curItem.eq(index).addClass('cur').siblings($curItem).removeClass('cur');
      this.addTouchEv();
      this.startFn();
      // this.imgAutoFn();

      $next.on('click', function() {
        _this.nextFn();
      });

      $prev.on('click', function() {
        _this.prevFunc();
      });
    },
	
    startFn: function() {
      var _this = this;
      timer = window.setInterval(_this.nextFn, opts.t);
    },
    nextFn: function() {
      var _this = g;
      index++;
      if (index >= s) {
        index = 0;
      }
      $items.animate({
        'marginLeft': -index * domWidth
      }, domWidth, function() {
        _this.curFn();
      });
    },
    addTouchEv: function() {
      $o[0].addEventListener('touchstart', this.touchStartFn);
      $o[0].addEventListener('touchmove', this.touchMoveFn);
      $o[0].addEventListener('touchend', this.touchEndFn);
    },
    touchStartFn: function(event) {
      // event.preventDefault();
      clearInterval(timer);
      var touch = event.touches[0];
      x = 0;
      startX = touch.pageX;
      startY = touch.pageY;
    },
    touchMoveFn: function(event) {
      // event.preventDefault();
      var touch = event.touches[0];
      x = touch.pageX - startX;
      $items.css('marginLeft', x - (index * domWidth));
    },
    touchEndFn: function(event) {
      // event.preventDefault();
      var _this = g;
      var t = domWidth - Math.abs(x);

      // x >0 从左向右滑动 上一张
      if (x > 0) {
        if (x >= opts.movePx) {
          index--;
          if (index < 0) {
            index = 0;
          }
        }
      } else {
        if (x <= -opts.movePx) {
          index++;
          if (index >= s) {
            index = s - 1;
          }
        }
      }
      $items.animate({
        'marginLeft': -index * domWidth
      }, t, function() {
        _this.startFn();
        _this.curFn();
      });
    },
    touchCancelFn: function() {},
    curFn: function() {
      var $curItem = $cur.find('a');
      if (!$curItem.eq(index).hasClass('cur')) {
        $curItem.removeClass('cur').eq(index).addClass('cur');
      }
    },
    imgAutoFn: function() {
      $item.each(function() {
        var $img = $(this).find('img:first');
        imgAuto($img);
      });

      function imgAuto($img) {
        var imgWidth = $img.width(),
          imgHeight = $img.height();
        var img = new Image();
        var imgTimer;
        img.src = $img.attr('src');

        var c = {
          auto: function() {
            var _this = this;
            imgTimer = window.setInterval(function() {
              if (img.width != 0 || img.height != 0) {
                window.clearInterval(imgTimer);
                _this.imgAuto();
              }
            }, 20);
          },
          imgAuto: function() {
            if (domWidth / domHeight > img.width / img.height) {
              // 图片 填充
              if (opts.imgFill) {
                imgWidth = domWidth;
                imgHeight = img.height * imgWidth / img.width;
              } else {
                imgHeight = domHeight;
                imgWidth = img.width * imgHeight / img.height;
              }
            } else {
              // 图片 填充
              if (opts.imgFill) {
                imgHeight = domHeight;
                imgWidth = img.width * imgHeight / img.height;
              } else {
                imgWidth = domWidth;
                imgHeight = img.height * imgWidth / img.width;
              }
            }

            $img.css({
              'width': imgWidth,
              'height': imgHeight,
              'marginLeft': (domWidth - imgWidth) / 2,
              'marginTop': (domHeight - imgHeight) / 2
            });
          }
        };
        c.auto();
      }
    }
  };
  g.init();
};
$(function() {
    var browser = {
        versions: function() {
            var u = navigator.userAgent,
                app = navigator.appVersion;
            return { //移动终端浏览器版本信息   
                trident: u.indexOf('Trident') > -1, //IE内核  
                presto: u.indexOf('Presto') > -1, //opera内核  
                webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核  
                gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核  
                mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端  
                ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端  
                android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器  
                iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器  
                iPad: u.indexOf('iPad') > -1, //是否iPad    
                webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部  
            };
        }(),
        language: (navigator.browserLanguage || navigator.language).toLowerCase()
    }

    if(/mobile/i.test(navigator.userAgent)) {
        $('html').addClass('isWap');
        $('#wrapper').show();
        wapFunc();
    } else {
        $('html').addClass('isPc');
        $('#wrapper').show();
        pcFunc();
    }  
// succ 
  (function() {
    var $slider = $('#succ');
    var $inner = $slider.find('.sliderInner'),
      $ul = $inner.find('ul:first'),
      $next = $slider.find('.btn-next'),
      $prev = $slider.find('.btn-prev');
    var $cur = $slider.find('.succ-cur');
    var index = 0,
      len = $ul.find('li').length;

    $next.on('click', function() {
      index = ++index > len - 1 ? 0 : index;

      showCurrentItem();
    });

    $prev.on('click', function() {
      index = --index < 0 ? len - 1 : index;

      showCurrentItem();
    });

    $cur.find('a').hover(function() {
      index = $(this).index();

      showCurrentItem();
    }, function() {});

    function showCurrentItem() {
      $ul.find('li').hide().eq(index).show();
      $cur.find('a').removeClass('cur').eq(index).addClass('cur');
    }
  })();
  
    
// LINKS
  (function() {
    var $select = $('.select-group');
    var $selected = $select.find('.select-selected');
    var $options = $select.find('.select-options');

    $select.on('click', function(e) {
      e.stopPropagation();
    });

    $selected.on('click', function() {
      if ($options.is(':hidden')) {
        $options.show();
      } else {
        $options.hide();
      }
    });

    $options.on('click', function() {
      $options.hide();
    });

    $(window).on('click', function() {
      $options.hide();
    });
  })();
  
// LINKS2
    (function() {
        var $select = $('#f_links'),
            $selected = $select.find('.s_selected'),
            $options = $select.find('.s_options');

        $select.on('click', function(e) {
            e.stopPropagation();
        });

        $selected.on('click', function() {
            if ($options.is(':hidden')) {
                $options.show();
            } else {
                $options.hide();
            }
        });

        $options.on('click', function() {
            $options.hide();
        });

        $(window).on('click', function() {
            $options.hide();
        });
    })();
});

// WAP
function wapFunc() {
    //submenu
	var  $menuTrigger = $('.has-submenu .subBtn');
			$menuTrigger.click(function (e) {
            e.preventDefault();
            var $this = $(this);
           $(this).toggleClass('active').next('ul').toggleClass('active');  
  });
   // 导航
  (function() {
    var $btn = $('#h-btn-nav');
    var $nav = $('#nav-container');
    var $close = $nav.find('.icon-close');
    var subClass = 'cur';

    $btn.on('click', function(e) {
      e.preventDefault();

      if ($nav.is(':hidden')) {
        $(this).addClass('h-switch-close');
        $nav.show();
        return;
      }

      $(this).removeClass('h-switch-close');
      $nav.hide();
    });

    $close.on('click', function(e) {
      e.preventDefault();
      $nav.hide();
    });

    $nav.on('click', '.icon-arrow', function(e) {
      e.preventDefault();
      var b = $(this).parent('a').parent('li').children('.nav-sub').is(':hidden');
      if (b) {
        $(this).html('-');
        $(this).parent('a').parent('li').children('.nav-sub').show();
      } else {
        $(this).html('+');
        // $(this).parents('li').removeClass('cur');
        $(this).parent('a').parent('li').children('.nav-sub').hide();
      }
    });
  })();
	
// 导航
  (function() {
    var $btn = $('#h-btn-nav2');
    var $nav = $('#nav-container2');
    var $close = $nav.find('.icon-close');
    var subClass = 'cur';

    $btn.on('click', function(e) {
      e.preventDefault();

      if ($nav.is(':hidden')) {
        $(this).addClass('h-switch-close');
        $nav.show();
        return;
      }

      $(this).removeClass('h-switch-close');
      $nav.hide();
    });

    $close.on('click', function(e) {
      e.preventDefault();
      $nav.hide();
    });

    $nav.on('click', '.icon-arrow', function(e) {
      e.preventDefault();
      var b = $(this).parent('a').parent('li').children('.nav-sub').is(':hidden');
      if (b) {
        $(this).html('-');
        $(this).parent('a').parent('li').children('.nav-sub').show();
      } else {
        $(this).html('+');
        // $(this).parents('li').removeClass('cur');
        $(this).parent('a').parent('li').children('.nav-sub').hide();
      }
    });
  })();
	
// 导航
  (function() {
    var $btn = $('#h-btn-nav3');
    var $nav = $('#nav-container3');
    var $close = $nav.find('.icon-close');
    var subClass = 'cur';

    $btn.on('click', function(e) {
      e.preventDefault();

      if ($nav.is(':hidden')) {
        $(this).addClass('h-switch-close');
        $nav.show();
        return;
      }

      $(this).removeClass('h-switch-close');
      $nav.hide();
    });

    $close.on('click', function(e) {
      e.preventDefault();
      $nav.hide();
    });

    $nav.on('click', '.icon-arrow', function(e) {
      e.preventDefault();
      var b = $(this).parent('a').parent('li').children('.nav-sub').is(':hidden');
      if (b) {
        $(this).html('-');
        $(this).parent('a').parent('li').children('.nav-sub').show();
      } else {
        $(this).html('+');
        // $(this).parents('li').removeClass('cur');
        $(this).parent('a').parent('li').children('.nav-sub').hide();
      }
    });
  })();
	
// 导航
  (function() {
    var $btn = $('#h-btn-nav4');
    var $nav = $('#nav-container4');
    var $close = $nav.find('.icon-close');
    var subClass = 'cur';

    $btn.on('click', function(e) {
      e.preventDefault();

      if ($nav.is(':hidden')) {
        $(this).addClass('h-switch-close');
        $nav.show();
        return;
      }

      $(this).removeClass('h-switch-close');
      $nav.hide();
    });

    $close.on('click', function(e) {
      e.preventDefault();
      $nav.hide();
    });

    $nav.on('click', '.icon-arrow', function(e) {
      e.preventDefault();
      var b = $(this).parent('a').parent('li').children('.nav-sub').is(':hidden');
      if (b) {
        $(this).html('-');
        $(this).parent('a').parent('li').children('.nav-sub').show();
      } else {
        $(this).html('+');
        // $(this).parents('li').removeClass('cur');
        $(this).parent('a').parent('li').children('.nav-sub').hide();
      }
    });
  })();

// 导航
  (function() {
    var $btn = $('#h-btn-nav5');
    var $nav = $('#nav-container5');
    var $close = $nav.find('.icon-close');
    var subClass = 'cur';

    $btn.on('click', function(e) {
      e.preventDefault();

      if ($nav.is(':hidden')) {
        $(this).addClass('h-switch-close');
        $nav.show();
        return;
      }

      $(this).removeClass('h-switch-close');
      $nav.hide();
    });

    $close.on('click', function(e) {
      e.preventDefault();
      $nav.hide();
    });

    $nav.on('click', '.icon-arrow', function(e) {
      e.preventDefault();
      var b = $(this).parent('a').parent('li').children('.nav-sub').is(':hidden');
      if (b) {
        $(this).html('-');
        $(this).parent('a').parent('li').children('.nav-sub').show();
      } else {
        $(this).html('+');
        // $(this).parents('li').removeClass('cur');
        $(this).parent('a').parent('li').children('.nav-sub').hide();
      }
    });
  })();
	
    //banner
    (function() {
        var $slider = $('#banner');

        if ($slider.length > 0) {
            $slider.touchSliderX();
        }
    })();
	
   // banner2
  (function() {
    var $slider = $('#banner2');

    if ($slider.length > 0) {
      $slider.touchSliderX();
    }
  })();
	
  // banner3
  (function() {
    var $slider = $('#banner3');

    if ($slider.length > 0) {
      $slider.touchSliderX();
    }
  })();
	
 // banner4
  (function() {
    var $slider = $('#banner4');

    if ($slider.length > 0) {
      $slider.touchSliderX();
    }
  })();
	
 // banner5
  (function() {
    var $slider = $('#banner5');

    if ($slider.length > 0) {
      $slider.touchSliderX();
    }
  })();
	
 // banner6
  (function() {
    var $slider = $('#banner6');

    if ($slider.length > 0) {
      $slider.touchSliderX();
    }
  })();
		
    //closeNav
	(function() {
	  var $btn = $('.menuLink');
	  var $search = $('.nav');
	  var $close = $search.find('.close2');

	  $btn.on('click', function() {
		$search.show();
	});

	  $close.on('click', function() {
		$search.hide();
	});
   })();
    // i-slider
  (function() {
    var $slider = $('#i-slider');
    var $inner = $slider.find('.sliderInner'),
      $next = $slider.find('.btn-next'),
      $prev = $slider.find('.btn-prev');

    var len = $inner.find('ul:first li').length;
    var domWidth = $inner.width();
    var itemWidth = $inner.find('li:first').outerWidth(true);

    var moveSize = 3;
    var i = 0;
    var max = Math.ceil(len / moveSize);

    $inner.find('ul:first').width(itemWidth * len);

    $next.on('click', function() {
      i = ++i > max - 1 ? 0 : i;

      $inner.find('ul:first').stop(true).animate({
        marginLeft: -i * itemWidth * moveSize
      }, domWidth / 1.2);
    });

    $prev.on('click', function() {
      i = --i < 0 ? max - 1 : i;

      $inner.find('ul:first').stop(true).animate({
        marginLeft: -i * itemWidth * moveSize
      }, domWidth / 1.2);
    });
  })();
}

// PC
function pcFunc() {
	 // 导航
  (function() {
    var $nav = $('#nav');
    var subClass = 'cur';

    $nav.find('li').hover(function() {
      $(this).addClass(subClass);
      $(this).children('.nav-sub').show();
    }, function() {
      $(this).removeClass(subClass);
      $(this).children('.nav-sub').hide();
    });
  })();
	
    // banner
    (function() {
        var $slider = $('#banner');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();
	
	// banner2
    (function() {
        var $slider = $('#banner2');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();
	
	// banner3
    (function() {
        var $slider = $('#banner3');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();	
	
	// banner4
    (function() {
        var $slider = $('#banner4');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();

	// banner5
    (function() {
        var $slider = $('#banner5');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();	
	
   // banner6
    (function() {
        var $slider = $('#banner6');

        if ($slider.length > 0) {
            $slider.sliderX({
                imgAuto: true, //图片居中处理
                imgFill: true //图片填充DOM
            });
        }
    })();
}

//Search
    (function() {
        var $btn = $('#inp_submit');
        var $search = $('#t_search');
        $btn.on('click', function() {
            $search.show();
			$search.toggleClass('active');
        });
    })();
	
//search
$(document).ready(function(){
  $('.search').hide(); //初始ul隐藏
  $('.ico_search').click(      
       function(){ $('.search').toggle();
	    $(this).toggleClass('active');//找到ul.son_ul显示
  }) 
})

//tab3 
window.onload = function(){ 
function scrollDoor(menus,divs,current,notCurrent,show,hide){
	  for(var i = 0 ; i < menus.length ; i++)
	  { 
		   document.getElementById(menus[i]).value = i; 
		   document.getElementById(menus[i]).href = "javascript:void(0)";    
		   document.getElementById(menus[i]).onclick = function(){			 
			for(var j = 0 ; j < menus.length ; j++)
			{      
				 document.getElementById(menus[j]).className = notCurrent;
				 document.getElementById(divs[j]).className = hide;
			}
			document.getElementById(menus[this.value]).className = current; 
			document.getElementById(divs[this.value]).className = show;  
		   }
	  }
 }
scrollDoor(["ind1_3","ind2_3","ind3_3","ind4_3","ind5_3","ind6_3","ind7_3","ind8_3","ind9_3","ind10_3","ind11_3","ind12_3","ind13_3","ind14_3","ind15_3","ind16_3","ind17_3","ind18_3","ind19_3"],
["i1_1_3","i1_2_3","i1_3_3","i1_4_3","i1_5_3","i1_6_3","i1_7_3","i1_8_3","i1_9_3","i1_10_3","i1_11_3","i1_12_3","i1_13_3","i1_14_3","i1_15_3","i1_16_3","i1_17_3","i1_18_3","i1_19_3"],"current","","show","");

scrollDoor(["ind1_4","ind2_4","ind3_4","ind4_4","ind5_4","ind6_4","ind7_4","ind8_4","ind9_4","ind10_4","ind11_4","ind12_4","ind13_4","ind14_4","ind15_4","ind16_4","ind17_4"],
["i1_1_4","i1_2_4","i1_3_4","i1_4_4","i1_5_4","i1_6_4","i1_7_4","i1_8_4","i1_9_4","i1_10_4","i1_11_4","i1_12_4","i1_13_4","i1_14_4","i1_15_4","i1_16_4","i1_17_4"],"current","","show","");

scrollDoor(["ind1_5","ind2_5","ind3_5","ind4_5","ind5_5","ind6_5","ind7_5","ind8_5","ind9_5","ind10_5","ind11_5","ind12_5","ind13_5","ind14_5","ind15_5","ind16_5","ind17_5","ind18_5"],
["i1_1_5","i1_2_5","i1_3_5","i1_4_5","i1_5_5","i1_6_5","i1_7_5","i1_8_5","i1_9_5","i1_10_5","i1_11_5","i1_12_5","i1_13_5","i1_14_5","i1_15_5","i1_16_5","i1_17_5","i1_18_5"],"current","","show","");
}
// JavaScript Document //tab3 20211019 end

$(document).ready(function(){
						   
	/* 滑动/展开 */
	$("ul.expmenu li > div.header").click(function(){
												   
		var arrow = $(this).find("span.arrow");
	
		if(arrow.hasClass("left")){
			arrow.removeClass("left");
			arrow.addClass("right");
		}else if(arrow.hasClass("right")){
			arrow.removeClass("right");
			arrow.addClass("left");
		}
	
		$(this).parent().find("ul.menu").slideToggle();
		
	});
	
});


function ShowMenu(obj,n){
 var Nav = obj.parentNode;
 if(!Nav.id){
  var BName = Nav.getElementsByTagName("ol");
  var HName = Nav.getElementsByTagName("h2");
  var t = 2;
 }else{
  var BName = document.getElementById(Nav.id).getElementsByTagName("span");
  var HName = document.getElementById(Nav.id).getElementsByTagName(".header");
  var t = 1;
 }
 for(var i=0; i<HName.length;i++){
  HName[i].innerHTML = HName[i].innerHTML.replace("-","+");
  HName[i].className = "";
 }
 obj.className = "h" + t;
 for(var i=0; i<BName.length; i++){if(i!=n){BName[i].className = "no";}}
 if(BName[n].className == "no"){
  BName[n].className = "";
  obj.innerHTML = obj.innerHTML.replace("+","-");
 }else{
  BName[n].className = "no";
  obj.className = "";
  obj.innerHTML = obj.innerHTML.replace("-","+");
 }
}

/* DaTouWang URL: www.datouwang.com */
$(document).ready(function(){				
				function G(s){
		return document.getElementById(s);
	}
	
	function getStyle(obj, attr){
		if(obj.currentStyle){
			return obj.currentStyle[attr];
		}else{
			return getComputedStyle(obj, false)[attr];
		}
	}
	
	function Animate(obj, json){
		if(obj.timer){
			clearInterval(obj.timer);
		}
		obj.timer = setInterval(function(){
			for(var attr in json){
				var iCur = parseInt(getStyle(obj, attr));
				iCur = iCur ? iCur : 0;
				var iSpeed = (json[attr] - iCur) / 4;
				iSpeed = iSpeed > 0 ? Math.ceil(iSpeed) : Math.floor(iSpeed);
				obj.style[attr] = iCur + iSpeed + 'px';
				if(iCur == json[attr]){
					clearInterval(obj.timer);
				}
			}
		}, 30);
	}

	var oPic = G("picBox");
	var oList = G("listBox");
	
	var oPrev = G("prev");
	var oNext = G("next");
	var oPrevTop = G("prevTop");
	var oNextTop = G("nextTop");

	var oPicLi = oPic.getElementsByTagName("li");
	var oListLi = oList.getElementsByTagName("li");
	var len1 = oPicLi.length;
	var len2 = oListLi.length;
	
	var oPicUl = oPic.getElementsByTagName("ul")[0];
	var oListUl = oList.getElementsByTagName("ul")[0];
	var w1 = oPicLi[0].offsetWidth;
	var w2 = oListLi[0].offsetWidth;

	oPicUl.style.width = (w1+9) * len1 + "px";
	oListUl.style.height = w2 * len2 + "px";

	var index = 0;
	
	var num = 4;
	var num2 = Math.ceil(num / 1);

	function Change(){

		Animate(oPicUl, {left: - index * w1});
		
		if(index < num2){
			Animate(oListUl, {left: 0});
		}else if(index + num <= len2){
			Animate(oListUl, {left: - (index - num + 1) *(w2+10) });
		}else{
			Animate(oListUl, {left: - (len2 - num) * (w2+10) });
		}

		for (var i = 0; i < len2; i++) {
			oListLi[i].className = "";
			if(i == index){
				oListLi[i].className = "on";
			}
		}
	}
	
	oNext.onclick = oNext.onclick = function(){
		
		index ++;
		index = index == len2 ? 0 : index;
		Change();
	}
	
	oPrev.onmouseover = oNext.onmouseover = oPrev.onmouseover = oNext.onmouseover = function(){
		clearInterval(timer);
		}
	oPrev.onmouseout = oNext.onmouseout = oPrev.onmouseout = oNext.onmouseout = function(){
		timer=setInterval(autoPlay,4000);
		}

	oPrev.onclick = oPrev.onclick = function(){

		index --;
		index = index == -1 ? len2 -1 : index;
		Change();
	}
	
	var timer=null;
	timer=setInterval(autoPlay,4000);
	function autoPlay(){
		    index ++;
			index = index == len2 ? 0 : index;
			Change();
		}
	
	

	for (var i = 0; i < len2; i++) {
		oListLi[i].index = i;
		oListLi[i].onclick = function(){
			index = this.index;

			Change();
		}
	}
	
});



