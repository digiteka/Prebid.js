import {
  AD_IMPRESSION,
  AD_COMPLETE,
  AD_CLICK,
  AD_STARTED,
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

  function getOrtbContent() {}
  function setAdTagUrl() {}
  function setAdXml() {}

  function onEvent(type, callback, payload) {
    console.log("Digiteka onEvent", type, callback, payload);
    player.ready(() => {
      registerListeners(type, callback, payload);
    });
  }

  function registerListeners(externalEventName, callback, basePayload) {
    let getEventPayload;

    switch (externalEventName) {
      case AD_STARTED:
      case AD_IMPRESSION:
      case AD_CLICK:
        getEventPayload = () => Object.assign({}, adState.getState());
        break;
      case AD_COMPLETE:
        getEventPayload = () => {
          const currentState = adState.getState();
          adState.clearState();
          return currentState;
        };
        break;

      default:
        return;
    }

    const eventHandler = getEventHandler(
      externalEventName,
      callback,
      basePayload,
      getEventPayload
    );

    const videojsEventName = utils.getVideojsEventName(externalEventName);

    if (AD_MANAGER_EVENTS.includes(externalEventName)) {
      player.on("ads-manager", () =>
        player.ima.addEventListener(videojsEventName, eventHandler)
      );
    } else {
      player.on(videojsEventName, eventHandler);
    }
  }

  function offEvent(event, callback) {
    const videojsEvent = utils.getVideojsEventName(event);
    if (!callback) {
      player.off(videojsEvent);
      return;
    }

    const eventHandler = callbackToHandler[event]; // callbackStorage.getCallback(event, callback);
    if (eventHandler) {
      player.off(videojsEvent, eventHandler);
    }
  }

  function destroy() {}

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

    setupCompleteCallbacks.forEach((callback) =>
      callback(SETUP_COMPLETE, payload)
    );
    setupCompleteCallbacks = [];

    isMuted = player.muted();

    setupFailedEventHandlers.forEach((eventHandler) =>
      player.off("error", eventHandler)
    );
    setupFailedEventHandlers = [];
  }
}

export const utils = {
  getVideojsEventName: function (eventName) {
    switch (eventName) {
      case AD_STARTED:
        return "start";
      case AD_IMPRESSION:
        return "impression";
      case AD_CLICK:
        return "click";
      case AD_COMPLETE:
        return "ended";
      default:
        return eventName;
    }
  },
};

const digitekaSubmoduleFactory = function (config) {
  console.log("digitekaSubmoduleFactory", config);
  const adState = adStateFactory();
  const callbackStorage = null;
  window.addEventListener("message", (e) => console.log("message", e));
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
