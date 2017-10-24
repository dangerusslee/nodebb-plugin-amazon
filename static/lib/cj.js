"use strict";
/* globals config */

(function() {
    var domains = ['www.livingsocial.com'];
    var websiteId = 8450503;
    var trackingServerDomain = 'www.anrdoezrs.net';
    var generateLinkOnLoad = true;
    var publisherId = 4999405;
    var sid = undefined;
    var debug = true;
    var amazon_tag= "test-20";
    if (config['affiliate']["amazon-tag"]) {
        amazon_tag=config['amazon']["amazon-tag"];
        log("found amazon tag - " + amazon_tag);
    }
    (function() {
        var getPageBasedImpressionUrl = function() {
            return '//' + trackingServerDomain + '/pageImpression';
        } , fetchCJDomains = function () {
            $.get( "http://www.yceml.net/am_gen/" + websiteId + "/include/joined/impressions/page/am.js", function(data) {
                console.log(data);
              });
            }
          , collectDomains = function(content) {
            var collectedDomains = [];
            var anchors = $(".content a");//content.getElementsByTagName("a");
            for (var i = 0; i < anchors.length; i++) {
                var url = anchors[i].href;
                collectedDomains.push(url.toLowerCase());
            }
            return collectedDomains;
        }
          , collectImpressions = function(doc) {
            var imgs = doc.getElementsByTagName("img");
            var srcs = [];
            for (var i = 0; i < imgs.length; i++) {
                var matches = imgs[i].src.match(/image-(\d+-\d+)/);
                if (matches) {
                    srcs.push(imgs[i].src);
                }
            }
            return srcs;
        }
          , appendThirdPartyImpressions = function(thirdPartyImpressions) {
            var impressionSources = JSON.parse(thirdPartyImpressions);
            for (var i = 0; i < impressionSources.length; i++) {
                var hiddenDiv = document.createElement("div");
                var url = impressionSources[i] + '&cachebuster=' + i;
                hiddenDiv.innerHTML = "<img style=\"display:none\" src=\"" + url + "\" />";
                document.body.appendChild(hiddenDiv.firstChild);
            }
        }
          , trackImpressions = function(doc) {
            var xhr = createCORSRequest('POST', getPageBasedImpressionUrl());
            if (xhr) {
                xhr.send(JSON.stringify({
                    publisherId: publisherId,
                    websiteId: websiteId,
                    urls: collectDomains(doc),
                    impressions: collectImpressions(doc)
                }));

                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 && xhr.status == 200) {
                        var thirdPartyImpressions = xhr.responseText;
                        if (thirdPartyImpressions !== undefined && thirdPartyImpressions.length > 0) {
                            appendThirdPartyImpressions(thirdPartyImpressions);
                        }
                    }
                }
                ;
            }
        }
          , createCORSRequest = function(method, url) {
            var xhr = new XMLHttpRequest();

            if ("withCredentials"in xhr) {
                xhr.open(method, url, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.withCredentials = true;
            } else if (typeof XDomainRequest != "undefined") {
                // IE <9 way of making CORS requests
                xhr = new XDomainRequest();
                xhr.open(method, url);
            } else {
                xhr = null;
            }
            return xhr;
        };

        return trackImpressions(document);
    }
    )();


    (function() {
        function log(consoleStr) {
            if (debug && window.console) {
                console.log(consoleStr);
            }
        }

        //IE 8 doesn't have indexOf
        if (!Array.prototype.indexOf) {
            log("shimming Array.indexOf ...");
            Array.prototype.indexOf = function(obj, start) {
                for (var i = (start || 0), j = this.length; i < j; i++) {
                    if (this[i] === obj) {
                        return i;
                    }
                }
                return -1;
            }
        }

        //dom ready with support for older browsers (IE8)
        //  if support no longer needed, just use
        //      document.addEventListener("DOMContentLoaded", handler, false)
        function bindReady(handler) {

            var called = false;

            function ready() {
                if (called)
                    return;
                called = true;
                handler()
            }

            if (document.addEventListener) {
                // native event
                log("using native addEventListener");
                document.addEventListener("DOMContentLoaded", ready, false)
            } else if (document.attachEvent) {
                // IE

                try {
                    var isFrame = window.frameElement != null
                } catch (e) {}

                // IE, the document is not inside a frame
                if (document.documentElement.doScroll && !isFrame) {
                    function tryScroll() {
                        if (called)
                            return;
                        try {
                            document.documentElement.doScroll("left");
                            log("using doScroll hack");
                            ready()
                        } catch (e) {
                            setTimeout(tryScroll, 10)
                        }
                    }

                    tryScroll()
                }

                // IE, the document is inside a frame
                document.attachEvent("onreadystatechange", function() {
                    if (document.readyState === "complete") {
                        log("using onreadystatechange");
                        ready()
                    }
                })
            }

            // Old browsers
            if (window.addEventListener) {
                log("using window addEventListener");
                window.addEventListener('load', ready, false)
            } else if (window.attachEvent) {
                log("using attachEvent onload");
                window.attachEvent('onload', ready)
            } else {
                var fn = window.onload;
                // very old browser, copy old onload
                window.onload = function() {
                    // replace by new onload and call the old one
                    log("using window.onload");
                    fn && fn();
                    ready()
                }
            }
        }

        //IE 8 doesn't have addEventListener
        function addEvent(element, event, func) {
            if (element.addEventListener) {
                element.addEventListener(event, func);
            } else if (element.attachEvent) {
                // IE DOM
                element.attachEvent("on" + event, func);
            }
        }

        function getDomainAndProtocol(url) {
            var matches = url.match(/^(https?)\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var protocol = matches && matches[1];
            var domain = matches && matches[2];
            return {
                domain: domain,
                protocol: protocol
            };
        }

        function matchesParentDomain(domain) {
            for (var i = 0; i < domains.length; i++) {
                var suffix = domains[i];
                if (domain.indexOf(suffix, domain.length - suffix.length) !== -1)
                    return true;
            }
            return false
        }

        function autoMonetizeLink(element) {
            var start = new Date().getTime();
            var url = element.href;
            var domainAndProtocol = getDomainAndProtocol(url);
            if (!domainAndProtocol.domain)
                return;

            var domainInLowerCase = domainAndProtocol.domain.toLowerCase();
            var hashIndex = url.indexOf('#');
            var frag = "";
            if (hashIndex > -1) {
                frag = url.substring(hashIndex + 1);
                url = url.substring(0, hashIndex);
            }
            if (domains.indexOf(domainInLowerCase) >= 0 || matchesParentDomain(domainInLowerCase)) {
                log("Domain found in list. Automonetizing...");
                var extraParams = "";
                if (sid) {
                    extraParams = "/sid/" + sid;
                }
                if (frag) {
                    extraParams = extraParams + "/fragment/" + encodeURIComponent(frag);
                }
                element.href = "//" + trackingServerDomain + "/links/" + websiteId + "/type/am" + extraParams + "/" + url;
            }
            else if (domainInLowerCase.indexOf("amazon.com")!== -1) {
                var u = new Url(url);
                u.query["tag"]=amazon_tag;
                element.href=u;
            }
            else {

                log("Domain not found in list. ");
            }

            log("total time: " + (new Date().getTime() - start));
        }

        function createClickHandlerFor(element) {
            return function() {
                autoMonetizeLink(element)
            }
            ;
        }

        function autoMonetizeLinks() {
            log("auto monetizing links");

            var anchors = $(".content a");//document.getElementsByTagName("a");
            log("found " + anchors.length + " a tags.");
            for (var i = 0; i < anchors.length; i++) {
                var anchor = anchors[i];
                if (generateLinkOnLoad)
                    autoMonetizeLink(anchor);
                else
                    addEvent(anchor, "click", createClickHandlerFor(anchor));
            }
        }
        $(window).on('action:ajaxify.end', function() {
            log("cj ajaxify.end");
            autoMonetizeLinks();
        });

        if (document.readyState === "complete") {
            log("readState is complete");
            autoMonetizeLinks();
        } else {
            log("DOMContentLoaded is registered");
            bindReady(autoMonetizeLinks)
        }
    }
    )();
}
)()
