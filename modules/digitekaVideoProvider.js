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
let createdFactory = false;

export function DigitekaProvider(
  providerConfig,
  adState_,
  callbackStorage_,
  utils
) {

  const callbackToHandler = {};
  const adState = adState_;
  const { divId } = providerConfig;
  let setupFailedEventHandlers = [];

  function init() {
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

    window.addEventListener('dtkPlayerReady', async (e) => {
      console.log(window.dtkIma, window.google.ima.AdEvent.Type);

      window.dtkIma.addEventListener(google.ima.AdEvent.Type.STARTED, console.log('ok started'));
      window.dtkIma.addEventListener(google.ima.AdEvent.Type.IMPRESSION, console.log('ok impression'));
      window.dtkIma.addEventListener(google.ima.AdEvent.Type.FIRST_QUARTILE, console.log('ok started'));
      window.dtkIma.addEventListener(google.ima.AdEvent.Type.MIDPOINT, console.log('ok started'));
      window.dtkIma.addEventListener(google.ima.AdEvent.Type.THIRD_QUARTILE, console.log('ok started'));
      window.dtkIma.addEventListener(google.ima.AdEvent.Type.COMPLETE, console.log('ok started'));
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
  }
};

const digitekaSubmoduleFactory = function (config) {
  if (!createdFactory) {
    createdFactory = true;

    const adState = adStateFactory();
    const callbackStorage = null;
    return DigitekaProvider(config, adState, callbackStorage, utils);
  }
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
      /*
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
      skip: skippable ? 1 : 0,*/
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
