const xdconfig = (function(){
  const script = document.currentScript;
  const configstr = script.dataset.config || '{}'
  return  JSON.parse(configstr.replaceAll("'", "\""))
})();

//console.log = function() {};

//['log', 'info', 'warn', 'debug'].forEach(method => {
//  console[method] = function() {};
//});
function getParams() {
//  const script = document.currentScript;
//  const configstr = script.dataset.config || '{}'
//  const config = JSON.parse(configstr.replaceAll("'", "\""))
//  return `${config.host}/api/gp?project=${config.project}&token=${config.token}`
  return `${xdconfig.host}/api/gp?project=${xdconfig.project}&token=${xdconfig.token}`
};
function getProject() {
  return xdconfig.project
}
function collectMetaTags() {
	const metaNames = [
		"articaltype",
		"filetype",
		"publishedtype",
		"pagetype",
		"catalogs",
		"contentid",
		"publishdate",
		"editor",
		"author",
		"source"
	];

  const metaTags = document.getElementsByTagName('meta')
  let metaData = {}
  const key = '$metas'
  metaData[key] = {}
  for (const tag of metaTags) {
    const name = tag.getAttribute('name')
    if (name && metaNames.includes(name)) {
      metaData[key][name] = tag.getAttribute('content')
    }
  }
  return metaData
}
function getCurrentUrl() {
  const currentScript = document.currentScript.src
  const currentScriptDir = currentScript.substring(0, currentScript.lastIndexOf('/'))
  return currentScriptDir
}
; (function (para) {
  var p = para.sdk_url,
    n = para.name,
    w = window,
    d = document,
    s = 'script',
    x = null,
    y = null
  if (typeof w['sensorsDataAnalytic201505'] !== 'undefined') {
    return false
  }
  w['sensorsDataAnalytic201505'] = n
  w[n] =
    w[n] ||
    function (a) {
      return function () {
        ; (w[n]._q = w[n]._q || []).push([a, arguments])
      }
    }
  var ifs = [
    'track',
    'quick',
    'register',
    'registerPage',
    'registerOnce',
    'trackSignup',
    'trackAbtest',
    'setProfile',
    'setOnceProfile',
    'appendProfile',
    'incrementProfile',
    'deleteProfile',
    'unsetProfile',
    'identify',
    'login',
    'logout',
    'trackLink',
    'clearAllRegister',
    'getAppStatus'
  ]
  for (var i = 0; i < ifs.length; i++) {
    w[n][ifs[i]] = w[n].call(null, ifs[i])
  }

  const currentDir = getCurrentUrl()
  if (!w[n]._t) {
    w[n].para = para

    var scriptURLs = [
      currentDir + '/plugins/session-event/index.js', //引用的session-event插件路径
      p
    ]

    function loadScript(index) {
      if (index >= scriptURLs.length) {
        return false
      }

      var x = d.createElement(s)
      y = d.getElementsByTagName(s)[0]
      x.async = 1
      x.src = scriptURLs[index]
      x.setAttribute('charset', 'UTF-8')
      x.onload = function () {
        loadScript(index + 1)
      }
      y.parentNode.insertBefore(x, y)
    }

    loadScript(0)
  }
  sensors.register(collectMetaTags())
  sensors.quick('isReady', function () {
    sensors.use('PageLeave', { heartbeat_interval_time: 5 })
    sensors.use('PageLoad')
    sensors.use('SessionEvent')
  })

  sensors.quick('autoTrackSinglePage')
})({
  sdk_url: getCurrentUrl() +'/sensorsdata.js',
  name: 'sensors',
  show_log: true,
  is_track_single_page: true,
  send_type: 'beacon',
  server_url: getParams(), 
  heatmap: {
    clickmap: 'default',
    scroll_notice_map: 'default',
    collect_tags: {
      div: true,
      img: true
    }
  },
  preset_properties: { latest_referrer_host: true }
})

//function updateIframeParams(){
//  const iframes = document.querySelectorAll('iframe')
//  const projectName = getProject()
//  console.log('project', projectName)
//  iframes.forEach(iframe => {
//    try {
//      console.log('SRC', iframe.src)
//      if(!iframe.src.includes('player_v5.html')){
//         return;
//      }
//      const url = new URL(iframe.src)
//      url.searchParams.set('pro', projectName)
//      iframe.src = url.toString()
//    } catch(e){
//       console.error('无效的iframe URL:', iframe.src)
//    }
//  })
//}


//window.addEventListener('DOMContentLoaded', ()=>{
//   updateIframeParams()
//})

// console.log = function(){}
//

const parentAppData = {
   projectName: getProject(),
   metas: collectMetaTags()['$metas']
}
window.addEventListener('message', (event) => {
    // const allowedOrigins = ['https://chinadaily.com']
    // if(!allowedOrigins.includes(event.origin)) return

    if(!event.data || event.data.type !== 'getParentData') return

    const response = {}
    const requestedKeys = event.data.keys || []
    
    requestedKeys.forEach(key=> {
        if(key in parentAppData) {
             response[key] = parentAppData[key]
        }
    })

     event.source.postMessage({
        type: 'parentDataResponse',
        data: response,
        requestId: event.data.requestId
     }, event.origin);
     
});
