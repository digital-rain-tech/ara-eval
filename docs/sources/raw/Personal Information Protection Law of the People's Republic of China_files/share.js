/**
 * 依赖JQuery脚本
 * 1. 引入share.css、qrcode.min.js和share.js文件；
 * 2. 在需要分享功能的元素上加上 data-share="facebook" 属性，目前支持facebook、twitter、linkedin、weibo和wechat。
 */
$(function () {
  initModel();
});

function showModel(id) {
  var $model = $(".share-model#" + id);
  if ($model.is(":hidden")) {
    $model.addClass("share-show");
    $model.show();
    setTimeout(function () {
      $model.removeClass("share-show");
    }, 250);
  }
}

function initModel() {
  var title = encodeURIComponent(document.title);
  var url = location.href;

  $("body").append(
    '<div class="share-model" id="wechat"><div class="model-nav"><h4>Share - Wechat</h4><i class="share-close"></i></div><div class="model-content" id="qrcode"></div></div>'
  );
  new QRCode(document.getElementById("qrcode"), {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // 防止有多个model
  $(".share-model").each(function () {
    var width = $(this).width();
    var height = $(this).height();
    $(this).css({
      left: "calc(50% - " + width / 2 + "px)",
      top: "calc(50% - " + height / 2 + "px)",
    });
  });

  $(".share-model i.share-close").on("click", function () {
    var $model = $(this).parents(".share-model");
    if ($model.is(":visible")) {
      $model.addClass("share-hide");
      setTimeout(function () {
        $model.hide();
        $model.removeClass("share-hide");
      }, 250);
    }
  });

  $('[data-share="facebook"]').on("click", function () {
    window.open(
      "https://www.facebook.com/sharer.php?title=" + title + "&u=" + url,
      "blank"
    );
  });

  $('[data-share="twitter"]').on("click", function () {
    window.open(
      "https://twitter.com/share?text=" + title + "&url=" + url,
      "blank"
    );
  });

  $('[data-share="weibo"]').on("click", function () {
    window.open(
      "https://service.weibo.com/share/share.php?title=" +
        title +
        "&url=" +
        url,
      "blank"
    );
  });

  $('[data-share="linkedin"]').on("click", function () {
    window.open(
      "https://www.linkedin.com/shareArticle?mini=true&title=" +
        title +
        "&url=" +
        url,
      "blank"
    );
  });

  $('[data-share="wechat"]').on("click", function () {
    showModel("wechat");
  });
}
