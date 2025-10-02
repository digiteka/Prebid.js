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

const AD_MANAGER_EVENTS = [AD_STARTED, AD_IMPRESSION, AD_COMPLETE];

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
  let player = null;
  const { divId } = providerConfig;
  let setupCompleteCallbacks = [];
  let setupFailedEventHandlers = [];

  function init() {
    console.log("DigitekaProvider init");
    triggerSetupComplete();
  }

  function getId() {
    return divId;
  }

  function getOrtbVideo() {
    if (!player) {
      return;
    }

    let playBackMethod = PLAYBACK_METHODS.CLICK_TO_PLAY;

    const autoplay = player.autoplay();
    const muted = player.muted() || autoplay === "muted";

    if (autoplay) {
      playBackMethod = muted
        ? PLAYBACK_METHODS.AUTOPLAY_MUTED
        : PLAYBACK_METHODS.AUTOPLAY;
    }
    const supportedMediaTypes = Object.values(VIDEO_MIME_TYPE).filter(
      (type) => player.canPlayType(type) !== ""
    );

    supportedMediaTypes.push(VPAID_MIME_TYPE);

    const video = {
      mimes: supportedMediaTypes,
      protocols: [PROTOCOLS.VAST_2_0],
      api: [
        API_FRAMEWORKS.VPAID_2_0, // TODO: needs a reference to the imaOptions used at setup to determine if vpaid can be used
      ],
      h: player.currentHeight(),
      w: player.currentWidth(),
      maxextended: -1,
      boxingallowed: 1,
      playbackmethod: [playBackMethod],
      playbackend: PLAYBACK_END.VIDEO_COMPLETION,
    };

    return video;
  }

  function getOrtbContent() { }
  function setAdTagUrl() { }
  function setAdXml() { }

  function onEvent(type, callback, payload) {
    console.log("Digiteka onEvent", type, callback, payload);
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
      const vast = utils.parseVASTBrowser(e?.detail?.vast);
      console.log('guigui', vast);
    });

    setupCompleteCallbacks.forEach((callback) =>
      callback(SETUP_COMPLETE, payload)
    );
    setupCompleteCallbacks = [];
  }
}

export const utils = {
  parseVAST: function (vastStr) {
    if (!vastStr) {
      console.warn("Empty VAST string");
      return;
    }

    const doc = new DOMParser().parseFromString(vastStr, "text/xml");

    // Petit helper pour lire le texte d’un nœud
    const text = (root, sel) => {
      const n = root.querySelector(sel);
      return n ? (n.textContent || "").trim() : null;
    };

    const ads = [...doc.querySelectorAll("VAST > Ad")].map(adEl => {
      const inline = adEl.querySelector("InLine");
      const linear = inline?.querySelector("Creatives > Creative > Linear");

      // Durée & skip
      const duration = linear ? text(linear, "Duration") : null;
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

      const clickThrough = text(adEl, "InLine > Creatives > Creative > Linear > VideoClicks > ClickThrough");

      return {
        adId: adEl.getAttribute("id") || null,
        adSystem: text(adEl, "InLine > AdSystem"),
        adTitle: text(adEl, "InLine > AdTitle"),
        description: text(adEl, "InLine > Description"),
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
