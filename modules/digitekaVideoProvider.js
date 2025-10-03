import {
  AD_IMPRESSION,
  AD_COMPLETE,
  AD_CLICK,
  AD_STARTED,
  SETUP_COMPLETE,
} from "../libraries/video/constants/events.js";
import {
  PROTOCOLS,
  API_FRAMEWORKS,
  VIDEO_MIME_TYPE,
  PLAYBACK_METHODS,
  PLCMT,
  VPAID_MIME_TYPE,
  PLAYBACK_END,
} from "../libraries/video/constants/ortb.js";
import { DIGITEKA_VENDOR } from "../libraries/video/constants/vendorCodes.js";
import { submodule } from "../src/hook.js";
import stateFactory from "../libraries/video/shared/state.js";
import { getEventHandler } from "../libraries/video/shared/eventHandler.js";
/**
 * @typedef {import('../libraries/video/shared/state.js').State} State
 */

const infos = {};
let vast;
let callbackPrebid = null;

export function DigitekaProvider(
  providerConfig,
  adState_,
  callbackStorage_,
  utils
) {
  console.log(
    "digitekaProvider",
    providerConfig,
    adState_,
    callbackStorage_,
    utils
  );
  const callbackToHandler = {};

  const adState = adState_;
  const { divId } = providerConfig;
  let setupFailedEventHandlers = [];

  function init() {
    console.log("DigitekaProvider init");
    triggerSetupComplete();
  }

  function getId() {
    return divId;
  }

  function getOrtbVideo() { }
  function getOrtbContent() { }
  function setAdTagUrl() { }
  function setAdXml() { }

  function onEvent(type, callback, payload) {
    if (type === SETUP_COMPLETE) {
      callbackPrebid = callback;
    }
  }

  function offEvent(event, callback) { }

  function destroy() { }

  return {
    init,
    getId,
    getOrtbVideo,
    getOrtbContent,
    setAdTagUrl,
    setAdXml,
    onEvent,
    offEvent,
    destroy,
  };

  function triggerSetupComplete() {
    const payload = {
      divId,
      type: SETUP_COMPLETE,
    };

    window.addEventListener('bidWinner', (e) => {
      console.log("Prebid coucou", e);
      vast = utils.parseVAST(e?.detail?.vast);
      const ad = vast?.ads[0];
      console.log('guigui', vast);

      // infos.adTagUrl =
      infos.offset = 'pre';
      // infos.loadTime =
      // infos.vastAdId =
      infos.adDescription = ad.description;
      // infos.adServer =
      infos.adTitle = ad.adTitle;
      // infos.advertiserId =
      // infos.advertiserName =
      // infos.dealId =
      infos.linear = true;
      infos.vastVersion = vast.version;
      // infos.creativeUrl =
      infos.adId = ad.adId;
      // infos.universalAdId =
      // infos.creativeId =
      // infos.creativeType =
      infos.redirectUrl = ad.clickThrough || null;
      infos.adPlacementType = 1;
      // infos.waterfallIndex =
      // infos.waterfallCount =
      // infos.adPodCount =
      // infos.adPodIndex =
      // infos.wrapperAdIds =

      // infos.time =
      // infos.duration =
    });

    callbackPrebid(SETUP_COMPLETE, payload);
  }
}

export const utils = {
  // Petit helper pour lire le texte d’un nœud
  text: function (root, sel) {
    if (!root) {
      return null;
    }

    const n = root.querySelector(sel);
    return n ? (n.textContent || "").trim() : null;
  },
  parseVAST: function (vastStr) {
    if (!vastStr) {
      console.warn("Empty VAST string");
      return;
    }

    const doc = new DOMParser().parseFromString(vastStr, "text/xml");

    const vastTagURI = utils.text(doc.querySelector("VASTAdTagURI"), "InLine > AdSystem")
    console.log('vastURI', vastTagURI);
    return;


    const ads = [...doc.querySelectorAll("VAST > Ad")].map(adEl => {
      const inline = adEl.querySelector("InLine");
      const linear = inline?.querySelector("Creatives > Creative > Linear");

      // Durée & skip
      const duration = linear ? utils.text(linear, "Duration") : null;
      const skipoffset = linear?.getAttribute("skipoffset") || null;

      // Media files
      const mediaFiles = linear
        ? [...linear.querySelectorAll("MediaFiles > MediaFile")].map(m => ({
          id: m.getAttribute("id") || null,
          type: m.getAttribute("type") || null,
          delivery: m.getAttribute("delivery") || null,
          width: m.getAttribute("width") ? Number(m.getAttribute("width")) : null,
          height: m.getAttribute("height") ? Number(m.getAttribute("height")) : null,
          bitrate: m.getAttribute("bitrate") ? Number(m.getAttribute("bitrate")) : null,
          url: (m.textContent || "").trim(),
        }))
        : [];

      // Tracking events
      const tracking = linear
        ? [...linear.querySelectorAll("TrackingEvents > Tracking")].map(t => ({
          event: t.getAttribute("event"),
          offset: t.getAttribute("offset") || null,
          url: (t.textContent || "").trim(),
        }))
        : [];

      // Impressions & ClickThrough
      const impressions = [...adEl.querySelectorAll("InLine > Impression")].map(i =>
        (i.textContent || "").trim()
      );

      const clickThrough = utils.text(adEl, "InLine > Creatives > Creative > Linear > VideoClicks > ClickThrough");

      return {
        adId: adEl.getAttribute("id") || null,
        adSystem: utils.text(adEl, "InLine > AdSystem"),
        adTitle: utils.text(adEl, "InLine > AdTitle"),
        description: utils.text(adEl, "InLine > Description"),
        duration,
        skipoffset,
        impressions,
        clickThrough,
        mediaFiles,
        tracking,
      };
    });

    return {
      version: doc.documentElement.getAttribute("version") || null,
      ads,
    };
  }
};

const digitekaSubmoduleFactory = function (config) {
  console.log("digitekaSubmoduleFactory", config);
  const adState = adStateFactory();
  const callbackStorage = null;
  return DigitekaProvider(config, adState, callbackStorage, utils);
};

digitekaSubmoduleFactory.vendorCode = DIGITEKA_VENDOR;
submodule("video", digitekaSubmoduleFactory);
export default digitekaSubmoduleFactory;

// STATE

/**
 * @returns {State}
 */
export function adStateFactory() {
  const adState = Object.assign({}, stateFactory());

  function updateForEvent(event) {
    if (!event) {
      return;
    }

    const skippable = event.skippable;
    const updates = {
      adId: event.adId,
      adServer: event.adSystem,
      advertiserName: event.advertiserName,
      redirectUrl: event.clickThroughUrl,
      creativeId: event.creativeId || event.creativeAdId,
      dealId: event.dealId,
      adDescription: event.description,
      linear: event.linear,
      creativeUrl: event.mediaUrl,
      adTitle: event.title,
      universalAdId: event.universalAdIdValue,
      creativeType: event.contentType,
      wrapperAdIds: event.adWrapperIds,
      skip: skippable ? 1 : 0,
    };

    const adPodInfo = event.adPodInfo;
    if (adPodInfo && adPodInfo.podIndex > -1) {
      updates.adPodCount = adPodInfo.totalAds;
      updates.adPodIndex = adPodInfo.adPosition - 1; // Per IMA docs, adPosition is 1 based.
    }

    if (adPodInfo && adPodInfo.timeOffset) {
      switch (adPodInfo.timeOffset) {
        case -1:
          updates.offset = "post";
          break;

        case 0:
          // TODO: Defaults to 0 if this ad is not part of a pod, or the pod is not part of an ad playlist. - need to check if loaded dynamically and pass last content time update
          updates.offset = "pre";
          break;

        default:
          updates.offset = "" + adPodInfo.timeOffset;
      }
    }

    if (skippable) {
      updates.skipafter = event.skipTimeOffset;
    }

    this.updateState(updates);
  }

  adState.updateForEvent = updateForEvent;

  return adState;
}
