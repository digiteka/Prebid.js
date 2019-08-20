import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import {VIDEO} from "../src/mediaTypes";
const BIDDER_CODE = 'digiteka';
const URL = '//www.ultimedia.com/deliver/ad/hb/';
export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [VIDEO],

    /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
    isBidRequestValid: function(bid) {
        if (bid && typeof bid.params !== 'object') {
            utils.logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
            return false;
        }
        if (!utils.getBidIdParameter('mdtk', bid.params)) {
            utils.logError(BIDDER_CODE + ': mdtk is not present in bidder params');
            return false;
        }
        if (!utils.getBidIdParameter('zone', bid.params)) {
            utils.logError(BIDDER_CODE + ': zone is not present in bidder params');
            return false;
        }
        if (!utils.deepAccess(bid, 'mediaTypes.video')) {
            utils.logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
            return false;
        }
        return !!(bid.params.mdtk) && !!(bid.params.zone);
    },

    /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
    buildRequests: function(validBidRequests, bidderRequest) {console.log('HBDEBUG DIGITEKA BUILDREQUESTS PARAMS', JSON.stringify(validBidRequests), JSON.stringify(bidderRequest));
        const bid = bidderRequest.bids[0];
        const payload = {
            mdtk: utils.getBidIdParameter('mdtk', bid.params),
            zone: utils.getBidIdParameter('zone', bid.params),
            ua: navigator.userAgent
        };
        if (bidderRequest && bidderRequest.gdprConsent) {
            payload.cs = bidderRequest.gdprConsent.consentString;
        }
        const payloadString = JSON.stringify(payload);console.log('HBDEBUG DIGITEKA BUILDREQUESTS RETURN', JSON.stringify({
            method: 'GET',
            url: URL,
            data: payloadString,
            bidRequest: bidderRequest
        }));
        return {
            method: 'GET',
            url: URL,
            data: payloadString,
            bidRequest: bidderRequest
        };
    },

    /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
    interpretResponse: function(serverResponse, bidderRequest) {
        serverResponse = serverResponse.body;
        const bids = [];
        if (!serverResponse || serverResponse.error) {
            let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
            if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
            utils.logError(errorMessage);
            return bids;
        }

        if (serverResponse.tags) {
            serverResponse.tags.forEach(serverBid => {
                const rtbBid = getRtbBid(serverBid);
                if (rtbBid) {
                    if (rtbBid.cpm !== 0 && includes(this.supportedMediaTypes, rtbBid.ad_type)) {
                        const bid = newBid(serverBid, rtbBid, bidderRequest);
                        bid.mediaType = parseMediaType(rtbBid);
                        bids.push(bid);
                    }
                }
            });
        }
        return bids;
    },

    /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = []
        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url
            });
        }
        return syncs;
    },

    /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
    onTimeout: function(data) {
        // Bidder specifc code
    },

    /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
    onBidWon: function(bid) {
        // Bidder specific code
    },

    /**
     * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
     * @param {Bid} The bid of which the targeting has been set
     */
    onSetTargeting: function(bid) {
        // Bidder specific code
    }
}
registerBidder(spec);