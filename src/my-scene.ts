// @ts-nocheck
import * as BABYLON from 'babylonjs';
import "babylonjs-loaders";
import {
    CharacterController
} from './CharacterController'
import {
    RemoteCharacterController
} from './RemoteCharacterController';
import LocalChannel from './agora/LocalChannel';
import * as workerTimers from 'worker-timers';
import {
    PBRMaterial
} from 'babylonjs/Materials/PBR/pbrMaterial';
import {
    SubscriptionClient
} from "graphql-subscriptions-client";

import {
    request,
    gql
} from 'graphql-request'

import * as idelcv from './IdleCanvas'
import {
    StandardMaterial
} from 'babylonjs/Materials/standardMaterial';
const abi = require('../abi/1.json')

var Buffer = require('buffer').Buffer
var ieee754 = require('ieee754')

export default class MyScene {
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.ArcRotateCamera;
    private _player: BABYLON.AbstractMesh;
    private _cc: CharacterController;
    private _playerList = {};
    private _ws = null;
    private _join_status = false;
    private _roomId = "celogamevers"
    private _matches = {}
    private _rcolor = {}
    private _color: BABYLON.Color3 = new BABYLON.Color3(0, 0, 0)
    private _matchquee = []
    private _matchdata = {}
    private _winnerquee = []
    private _winnerdata = {}
    private mynfts = []
    private curr_nft = 0
    private _queue = []
    private _queue_state = true
    private _currentBlock = 0
    private mainCanvas = null
    private brdcanvas = null
    constructor(canvasElement: string) {
        // Create canvas and engine.
        this._canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        this._engine = new BABYLON.Engine(this._canvas, true);

    }


    async preloadImages(array) {
        return new Promise((myResolve, myReject) => {
            let j = 0
            for (var i = 0; i < array.length; i++) {
                var img = new Image();
                img.onload = () => {
                    console.log("loaded: " + j)
                    j++
                    if (j == array.length) {
                        myResolve()
                    }
                }
                img.src = array[i];
            }
        });
    }



    uIkit() {
        web3.eth.getAccounts().then((data) => {
            $("#wallet_address").text(data[0])

        })

        $("#avnfts").empty()
        this.curr_nft = 0
        for (let k = 0; k < this.mynfts.length; k++) {
            let bg = ""
            if (k == this.curr_nft) {
                bg = "background-color: black;"
                $("#stkk").text(this.mynfts[this.curr_nft][1][0])
                $("#stko").text(this.mynfts[this.curr_nft][1][1])
            }
            let a = `<div id="avnft_${k}" style="${bg}border-radius: 50px;">`
            a += `<img draggable='false' src="${`https://${this.mynfts[k][0]}.ipfs.infura-ipfs.io/`}"  height="48" width="48">`
            a += '</img></div>'
            $("#avnfts").append(a)
        }
    }

    setHandlerV() {
        $("#nright").click(() => {
            if (this.mynfts.length <= 0) {
                return;
            }
            $(`#avnft_${ this.curr_nft}`).attr('style', '');
            this.curr_nft = (this.curr_nft + 1) % this.mynfts.length
            $("#stkk").text(this.mynfts[this.curr_nft][1][0])
            $("#stko").text(this.mynfts[this.curr_nft][1][1])
            $(`#avnft_${ this.curr_nft}`).attr('style', 'background-color: black;border-radius: 50px;');
        })
        $("#nleft").click(() => {
            if (this.mynfts.length <= 0) {
                return;
            }
            $(`#avnft_${ this.curr_nft}`).attr('style', '');
            this.curr_nft = this.curr_nft - 1
            if (this.curr_nft < 0) {
                this.curr_nft = this.mynfts.length - 1
            }
            $("#stkk").text(this.mynfts[this.curr_nft][1][0])
            $("#stko").text(this.mynfts[this.curr_nft][1][1])
            $(`#avnft_${ this.curr_nft }`).attr('style', 'background-color: black;border-radius: 50px;');
        })

        $("#ms").click(() => {
            $("#ws").attr("class", "mbuttons");
            $("#ms").attr("class", "smbuttons");
            $("#list").show()
            $("#list1").hide()

        })
        $("#ws").click(() => {
            $("#ws").attr("class", "smbuttons");
            $("#ms").attr("class", "mbuttons");
            $("#list").hide()
            $("#list1").show()
        })

        $("#matchit").click(async () => {
            if (this.curr_nft != null && this.mynfts.length > 0) {
                let contract = await new window.web3.eth.Contract(abi, "0xeDa409417bFBcd74A9fA52b1f7c038a45F629669");
                let a = await window.web3.eth.getAccounts();
                await contract.methods.Playerpart(this.mynfts[this.curr_nft][2]).send({
                    from: a[0]
                });
                this.get_my_details()
            }
        })
    }





    async wsClient(callback) {
        console.log("Initialsing Websocket Connection...")
        callback(false, "Joining Room...")
        try {
            this._ws = new WebSocket('wss://oecmeta.herokuapp.com/ws');
            this._ws.binaryType = "arraybuffer";
            this._ws.onclose = () => {
                this._ws = null;
                for (let a in this._playerList) {
                    let p: RemoteCharacterController = this._playerList[a]
                    p._avatar.dispose()
                    delete this._playerList[a]
                }
                console.log("Connection closed!")
                console.log("Retrying....")
                setTimeout(() => {
                    console.log("Retrying again after 1s delay...")
                    this.wsClient(callback)
                }, 1000)
            }

            this._ws.onerror = (e) => {
                console.log("Webscoket Error: " + e)
            }

            this._ws.onmessage = async (event) => {
                let data = event.data;
                if (typeof data == "string") {
                    data = JSON.parse(data)
                    if (data.response == "room_joined") {
                        if (!this._join_status) {
                            this._scene = new BABYLON.Scene(this._engine);
                            callback(false, "Loading Character...")
                            await this.loadPlayer()
                            callback(false, "Creating Scene...")
                            this.preloadImages(["/streetfight/images/arenas/0/arena.png", "/streetfight/images/arenas/1/arena.png", "/streetfight/images/fighters/kano/left/attractive-stand-up/0.png", "/streetfight/images/fighters/kano/left/attractive-stand-up/1.png", "/streetfight/images/fighters/kano/left/attractive-stand-up/2.png", "/streetfight/images/fighters/kano/left/attractive-stand-up/3.png", "/streetfight/images/fighters/kano/left/backward-jump/0.png", "/streetfight/images/fighters/kano/left/backward-jump/1.png", "/streetfight/images/fighters/kano/left/backward-jump/2.png", "/streetfight/images/fighters/kano/left/backward-jump/3.png", "/streetfight/images/fighters/kano/left/backward-jump/4.png", "/streetfight/images/fighters/kano/left/backward-jump/5.png", "/streetfight/images/fighters/kano/left/backward-jump/6.png", "/streetfight/images/fighters/kano/left/backward-jump/7.png", "/streetfight/images/fighters/kano/left/backward-jump-kick/0.png", "/streetfight/images/fighters/kano/left/backward-jump-kick/1.png", "/streetfight/images/fighters/kano/left/backward-jump-kick/2.png", "/streetfight/images/fighters/kano/left/backward-jump-punch/0.png", "/streetfight/images/fighters/kano/left/backward-jump-punch/1.png", "/streetfight/images/fighters/kano/left/backward-jump-punch/2.png", "/streetfight/images/fighters/kano/left/blocking/0.png", "/streetfight/images/fighters/kano/left/blocking/1.png", "/streetfight/images/fighters/kano/left/blocking/2.png", "/streetfight/images/fighters/kano/left/endure/0.png", "/streetfight/images/fighters/kano/left/endure/1.png", "/streetfight/images/fighters/kano/left/endure/2.png", "/streetfight/images/fighters/kano/left/fall/0.png", "/streetfight/images/fighters/kano/left/fall/1.png", "/streetfight/images/fighters/kano/left/fall/2.png", "/streetfight/images/fighters/kano/left/fall/3.png", "/streetfight/images/fighters/kano/left/fall/4.png", "/streetfight/images/fighters/kano/left/fall/5.png", "/streetfight/images/fighters/kano/left/fall/6.png", "/streetfight/images/fighters/kano/left/forward-jump/0.png", "/streetfight/images/fighters/kano/left/forward-jump/1.png", "/streetfight/images/fighters/kano/left/forward-jump/2.png", "/streetfight/images/fighters/kano/left/forward-jump/3.png", "/streetfight/images/fighters/kano/left/forward-jump/4.png", "/streetfight/images/fighters/kano/left/forward-jump/5.png", "/streetfight/images/fighters/kano/left/forward-jump/6.png", "/streetfight/images/fighters/kano/left/forward-jump/7.png", "/streetfight/images/fighters/kano/left/forward-jump-kick/0.png", "/streetfight/images/fighters/kano/left/forward-jump-kick/1.png", "/streetfight/images/fighters/kano/left/forward-jump-kick/2.png", "/streetfight/images/fighters/kano/left/forward-jump-punch/0.png", "/streetfight/images/fighters/kano/left/forward-jump-punch/1.png", "/streetfight/images/fighters/kano/left/forward-jump-punch/2.png", "/streetfight/images/fighters/kano/left/high-kick/0.png", "/streetfight/images/fighters/kano/left/high-kick/1.png", "/streetfight/images/fighters/kano/left/high-kick/2.png", "/streetfight/images/fighters/kano/left/high-kick/3.png", "/streetfight/images/fighters/kano/left/high-kick/4.png", "/streetfight/images/fighters/kano/left/high-kick/5.png", "/streetfight/images/fighters/kano/left/high-kick/6.png", "/streetfight/images/fighters/kano/left/high-punch/0.png", "/streetfight/images/fighters/kano/left/high-punch/1.png", "/streetfight/images/fighters/kano/left/high-punch/2.png", "/streetfight/images/fighters/kano/left/high-punch/3.png", "/streetfight/images/fighters/kano/left/high-punch/4.png", "/streetfight/images/fighters/kano/left/high-punch/5.png", "/streetfight/images/fighters/kano/left/high-punch/6.png", "/streetfight/images/fighters/kano/left/high-punch/7.png", "/streetfight/images/fighters/kano/left/jumping/0.png", "/streetfight/images/fighters/kano/left/jumping/1.png", "/streetfight/images/fighters/kano/left/jumping/2.png", "/streetfight/images/fighters/kano/left/jumping/3.png", "/streetfight/images/fighters/kano/left/jumping/4.png", "/streetfight/images/fighters/kano/left/jumping/5.png", "/streetfight/images/fighters/kano/left/knock-down/0.png", "/streetfight/images/fighters/kano/left/knock-down/1.png", "/streetfight/images/fighters/kano/left/knock-down/2.png", "/streetfight/images/fighters/kano/left/knock-down/3.png", "/streetfight/images/fighters/kano/left/knock-down/4.png", "/streetfight/images/fighters/kano/left/knock-down/5.png", "/streetfight/images/fighters/kano/left/knock-down/6.png", "/streetfight/images/fighters/kano/left/knock-down/7.png", "/streetfight/images/fighters/kano/left/knock-down/8.png", "/streetfight/images/fighters/kano/left/knock-down/9.png", "/streetfight/images/fighters/kano/left/low-kick/0.png", "/streetfight/images/fighters/kano/left/low-kick/1.png", "/streetfight/images/fighters/kano/left/low-kick/2.png", "/streetfight/images/fighters/kano/left/low-kick/3.png", "/streetfight/images/fighters/kano/left/low-kick/4.png", "/streetfight/images/fighters/kano/left/low-kick/5.png", "/streetfight/images/fighters/kano/left/low-punch/0.png", "/streetfight/images/fighters/kano/left/low-punch/1.png", "/streetfight/images/fighters/kano/left/low-punch/2.png", "/streetfight/images/fighters/kano/left/low-punch/3.png", "/streetfight/images/fighters/kano/left/low-punch/4.png", "/streetfight/images/fighters/kano/left/spin-kick/0.png", "/streetfight/images/fighters/kano/left/spin-kick/1.png", "/streetfight/images/fighters/kano/left/spin-kick/2.png", "/streetfight/images/fighters/kano/left/spin-kick/3.png", "/streetfight/images/fighters/kano/left/spin-kick/4.png", "/streetfight/images/fighters/kano/left/spin-kick/5.png", "/streetfight/images/fighters/kano/left/spin-kick/6.png", "/streetfight/images/fighters/kano/left/spin-kick/7.png", "/streetfight/images/fighters/kano/left/squat-endure/0.png", "/streetfight/images/fighters/kano/left/squat-endure/1.png", "/streetfight/images/fighters/kano/left/squat-endure/2.png", "/streetfight/images/fighters/kano/left/squat-high-kick/0.png", "/streetfight/images/fighters/kano/left/squat-high-kick/1.png", "/streetfight/images/fighters/kano/left/squat-high-kick/2.png", "/streetfight/images/fighters/kano/left/squat-high-kick/3.png", "/streetfight/images/fighters/kano/left/squat-low-kick/0.png", "/streetfight/images/fighters/kano/left/squat-low-kick/1.png", "/streetfight/images/fighters/kano/left/squat-low-kick/2.png", "/streetfight/images/fighters/kano/left/squat-low-punch/0.png", "/streetfight/images/fighters/kano/left/squat-low-punch/1.png", "/streetfight/images/fighters/kano/left/squat-low-punch/2.png", "/streetfight/images/fighters/kano/left/squating/0.png", "/streetfight/images/fighters/kano/left/squating/1.png", "/streetfight/images/fighters/kano/left/squating/2.png", "/streetfight/images/fighters/kano/left/stand/0.png", "/streetfight/images/fighters/kano/left/stand/1.png", "/streetfight/images/fighters/kano/left/stand/2.png", "/streetfight/images/fighters/kano/left/stand/3.png", "/streetfight/images/fighters/kano/left/stand/4.png", "/streetfight/images/fighters/kano/left/stand/5.png", "/streetfight/images/fighters/kano/left/stand/6.png", "/streetfight/images/fighters/kano/left/stand/7.png", "/streetfight/images/fighters/kano/left/stand/8.png", "/streetfight/images/fighters/kano/left/stand-up/0.png", "/streetfight/images/fighters/kano/left/stand-up/1.png", "/streetfight/images/fighters/kano/left/stand-up/2.png", "/streetfight/images/fighters/kano/left/uppercut/0.png", "/streetfight/images/fighters/kano/left/uppercut/1.png", "/streetfight/images/fighters/kano/left/uppercut/2.png", "/streetfight/images/fighters/kano/left/uppercut/3.png", "/streetfight/images/fighters/kano/left/uppercut/4.png", "/streetfight/images/fighters/kano/left/uppercut/5.png", "/streetfight/images/fighters/kano/left/walking/0.png", "/streetfight/images/fighters/kano/left/walking/1.png", "/streetfight/images/fighters/kano/left/walking/2.png", "/streetfight/images/fighters/kano/left/walking/3.png", "/streetfight/images/fighters/kano/left/walking/4.png", "/streetfight/images/fighters/kano/left/walking/5.png", "/streetfight/images/fighters/kano/left/walking/6.png", "/streetfight/images/fighters/kano/left/walking/7.png", "/streetfight/images/fighters/kano/left/walking/8.png", "/streetfight/images/fighters/kano/left/walking-backward/0.png", "/streetfight/images/fighters/kano/left/walking-backward/1.png", "/streetfight/images/fighters/kano/left/walking-backward/2.png", "/streetfight/images/fighters/kano/left/walking-backward/3.png", "/streetfight/images/fighters/kano/left/walking-backward/4.png", "/streetfight/images/fighters/kano/left/walking-backward/5.png", "/streetfight/images/fighters/kano/left/walking-backward/6.png", "/streetfight/images/fighters/kano/left/walking-backward/7.png", "/streetfight/images/fighters/kano/left/walking-backward/8.png", "/streetfight/images/fighters/kano/left/win/0.png", "/streetfight/images/fighters/kano/left/win/1.png", "/streetfight/images/fighters/kano/left/win/2.png", "/streetfight/images/fighters/kano/left/win/3.png", "/streetfight/images/fighters/kano/left/win/4.png", "/streetfight/images/fighters/kano/left/win/5.png", "/streetfight/images/fighters/kano/left/win/6.png", "/streetfight/images/fighters/kano/left/win/7.png", "/streetfight/images/fighters/kano/left/win/8.png", "/streetfight/images/fighters/kano/left/win/9.png", "/streetfight/images/fighters/kano/right/attractive-stand-up/0.png", "/streetfight/images/fighters/kano/right/attractive-stand-up/1.png", "/streetfight/images/fighters/kano/right/attractive-stand-up/2.png", "/streetfight/images/fighters/kano/right/attractive-stand-up/3.png", "/streetfight/images/fighters/kano/right/backward-jump/0.png", "/streetfight/images/fighters/kano/right/backward-jump/1.png", "/streetfight/images/fighters/kano/right/backward-jump/2.png", "/streetfight/images/fighters/kano/right/backward-jump/3.png", "/streetfight/images/fighters/kano/right/backward-jump/4.png", "/streetfight/images/fighters/kano/right/backward-jump/5.png", "/streetfight/images/fighters/kano/right/backward-jump/6.png", "/streetfight/images/fighters/kano/right/backward-jump/7.png", "/streetfight/images/fighters/kano/right/backward-jump-kick/0.png", "/streetfight/images/fighters/kano/right/backward-jump-kick/1.png", "/streetfight/images/fighters/kano/right/backward-jump-kick/2.png", "/streetfight/images/fighters/kano/right/backward-jump-punch/0.png", "/streetfight/images/fighters/kano/right/backward-jump-punch/1.png", "/streetfight/images/fighters/kano/right/backward-jump-punch/2.png", "/streetfight/images/fighters/kano/right/blocking/0.png", "/streetfight/images/fighters/kano/right/blocking/1.png", "/streetfight/images/fighters/kano/right/blocking/2.png", "/streetfight/images/fighters/kano/right/endure/0.png", "/streetfight/images/fighters/kano/right/endure/1.png", "/streetfight/images/fighters/kano/right/endure/2.png", "/streetfight/images/fighters/kano/right/fall/0.png", "/streetfight/images/fighters/kano/right/fall/1.png", "/streetfight/images/fighters/kano/right/fall/2.png", "/streetfight/images/fighters/kano/right/fall/3.png", "/streetfight/images/fighters/kano/right/fall/4.png", "/streetfight/images/fighters/kano/right/fall/5.png", "/streetfight/images/fighters/kano/right/fall/6.png", "/streetfight/images/fighters/kano/right/forward-jump/0.png", "/streetfight/images/fighters/kano/right/forward-jump/1.png", "/streetfight/images/fighters/kano/right/forward-jump/2.png", "/streetfight/images/fighters/kano/right/forward-jump/3.png", "/streetfight/images/fighters/kano/right/forward-jump/4.png", "/streetfight/images/fighters/kano/right/forward-jump/5.png", "/streetfight/images/fighters/kano/right/forward-jump/6.png", "/streetfight/images/fighters/kano/right/forward-jump/7.png", "/streetfight/images/fighters/kano/right/forward-jump-kick/0.png", "/streetfight/images/fighters/kano/right/forward-jump-kick/1.png", "/streetfight/images/fighters/kano/right/forward-jump-kick/2.png", "/streetfight/images/fighters/kano/right/forward-jump-punch/0.png", "/streetfight/images/fighters/kano/right/forward-jump-punch/1.png", "/streetfight/images/fighters/kano/right/forward-jump-punch/2.png", "/streetfight/images/fighters/kano/right/high-kick/0.png", "/streetfight/images/fighters/kano/right/high-kick/1.png", "/streetfight/images/fighters/kano/right/high-kick/2.png", "/streetfight/images/fighters/kano/right/high-kick/3.png", "/streetfight/images/fighters/kano/right/high-kick/4.png", "/streetfight/images/fighters/kano/right/high-kick/5.png", "/streetfight/images/fighters/kano/right/high-kick/6.png", "/streetfight/images/fighters/kano/right/high-punch/0.png", "/streetfight/images/fighters/kano/right/high-punch/1.png", "/streetfight/images/fighters/kano/right/high-punch/2.png", "/streetfight/images/fighters/kano/right/high-punch/3.png", "/streetfight/images/fighters/kano/right/high-punch/4.png", "/streetfight/images/fighters/kano/right/high-punch/5.png", "/streetfight/images/fighters/kano/right/high-punch/6.png", "/streetfight/images/fighters/kano/right/high-punch/7.png", "/streetfight/images/fighters/kano/right/jumping/0.png", "/streetfight/images/fighters/kano/right/jumping/1.png", "/streetfight/images/fighters/kano/right/jumping/2.png", "/streetfight/images/fighters/kano/right/jumping/3.png", "/streetfight/images/fighters/kano/right/jumping/4.png", "/streetfight/images/fighters/kano/right/jumping/5.png", "/streetfight/images/fighters/kano/right/knock-down/0.png", "/streetfight/images/fighters/kano/right/knock-down/1.png", "/streetfight/images/fighters/kano/right/knock-down/2.png", "/streetfight/images/fighters/kano/right/knock-down/3.png", "/streetfight/images/fighters/kano/right/knock-down/4.png", "/streetfight/images/fighters/kano/right/knock-down/5.png", "/streetfight/images/fighters/kano/right/knock-down/6.png", "/streetfight/images/fighters/kano/right/knock-down/7.png", "/streetfight/images/fighters/kano/right/knock-down/8.png", "/streetfight/images/fighters/kano/right/knock-down/9.png", "/streetfight/images/fighters/kano/right/low-kick/0.png", "/streetfight/images/fighters/kano/right/low-kick/1.png", "/streetfight/images/fighters/kano/right/low-kick/2.png", "/streetfight/images/fighters/kano/right/low-kick/3.png", "/streetfight/images/fighters/kano/right/low-kick/4.png", "/streetfight/images/fighters/kano/right/low-kick/5.png", "/streetfight/images/fighters/kano/right/low-punch/0.png", "/streetfight/images/fighters/kano/right/low-punch/1.png", "/streetfight/images/fighters/kano/right/low-punch/2.png", "/streetfight/images/fighters/kano/right/low-punch/3.png", "/streetfight/images/fighters/kano/right/low-punch/4.png", "/streetfight/images/fighters/kano/right/spin-kick/0.png", "/streetfight/images/fighters/kano/right/spin-kick/1.png", "/streetfight/images/fighters/kano/right/spin-kick/2.png", "/streetfight/images/fighters/kano/right/spin-kick/3.png", "/streetfight/images/fighters/kano/right/spin-kick/4.png", "/streetfight/images/fighters/kano/right/spin-kick/5.png", "/streetfight/images/fighters/kano/right/spin-kick/6.png", "/streetfight/images/fighters/kano/right/spin-kick/7.png", "/streetfight/images/fighters/kano/right/squat-endure/0.png", "/streetfight/images/fighters/kano/right/squat-endure/1.png", "/streetfight/images/fighters/kano/right/squat-endure/2.png", "/streetfight/images/fighters/kano/right/squat-high-kick/0.png", "/streetfight/images/fighters/kano/right/squat-high-kick/1.png", "/streetfight/images/fighters/kano/right/squat-high-kick/2.png", "/streetfight/images/fighters/kano/right/squat-high-kick/3.png", "/streetfight/images/fighters/kano/right/squat-low-kick/0.png", "/streetfight/images/fighters/kano/right/squat-low-kick/1.png", "/streetfight/images/fighters/kano/right/squat-low-kick/2.png", "/streetfight/images/fighters/kano/right/squat-low-punch/0.png", "/streetfight/images/fighters/kano/right/squat-low-punch/1.png", "/streetfight/images/fighters/kano/right/squat-low-punch/2.png", "/streetfight/images/fighters/kano/right/squating/0.png", "/streetfight/images/fighters/kano/right/squating/1.png", "/streetfight/images/fighters/kano/right/squating/2.png", "/streetfight/images/fighters/kano/right/stand/0.png", "/streetfight/images/fighters/kano/right/stand/1.png", "/streetfight/images/fighters/kano/right/stand/2.png", "/streetfight/images/fighters/kano/right/stand/3.png", "/streetfight/images/fighters/kano/right/stand/4.png", "/streetfight/images/fighters/kano/right/stand/5.png", "/streetfight/images/fighters/kano/right/stand/6.png", "/streetfight/images/fighters/kano/right/stand/7.png", "/streetfight/images/fighters/kano/right/stand/8.png", "/streetfight/images/fighters/kano/right/stand-up/0.png", "/streetfight/images/fighters/kano/right/stand-up/1.png", "/streetfight/images/fighters/kano/right/stand-up/2.png", "/streetfight/images/fighters/kano/right/uppercut/0.png", "/streetfight/images/fighters/kano/right/uppercut/1.png", "/streetfight/images/fighters/kano/right/uppercut/2.png", "/streetfight/images/fighters/kano/right/uppercut/3.png", "/streetfight/images/fighters/kano/right/uppercut/4.png", "/streetfight/images/fighters/kano/right/uppercut/5.png", "/streetfight/images/fighters/kano/right/walking/0.png", "/streetfight/images/fighters/kano/right/walking/1.png", "/streetfight/images/fighters/kano/right/walking/2.png", "/streetfight/images/fighters/kano/right/walking/3.png", "/streetfight/images/fighters/kano/right/walking/4.png", "/streetfight/images/fighters/kano/right/walking/5.png", "/streetfight/images/fighters/kano/right/walking/6.png", "/streetfight/images/fighters/kano/right/walking/7.png", "/streetfight/images/fighters/kano/right/walking/8.png", "/streetfight/images/fighters/kano/right/walking-backward/0.png", "/streetfight/images/fighters/kano/right/walking-backward/1.png", "/streetfight/images/fighters/kano/right/walking-backward/2.png", "/streetfight/images/fighters/kano/right/walking-backward/3.png", "/streetfight/images/fighters/kano/right/walking-backward/4.png", "/streetfight/images/fighters/kano/right/walking-backward/5.png", "/streetfight/images/fighters/kano/right/walking-backward/6.png", "/streetfight/images/fighters/kano/right/walking-backward/7.png", "/streetfight/images/fighters/kano/right/walking-backward/8.png", "/streetfight/images/fighters/kano/right/win/0.png", "/streetfight/images/fighters/kano/right/win/1.png", "/streetfight/images/fighters/kano/right/win/2.png", "/streetfight/images/fighters/kano/right/win/3.png", "/streetfight/images/fighters/kano/right/win/4.png", "/streetfight/images/fighters/kano/right/win/5.png", "/streetfight/images/fighters/kano/right/win/6.png", "/streetfight/images/fighters/kano/right/win/7.png", "/streetfight/images/fighters/kano/right/win/8.png", "/streetfight/images/fighters/kano/right/win/9.png", "/streetfight/images/fighters/subzero/left/attractive-stand-up/0.png", "/streetfight/images/fighters/subzero/left/attractive-stand-up/1.png", "/streetfight/images/fighters/subzero/left/attractive-stand-up/2.png", "/streetfight/images/fighters/subzero/left/attractive-stand-up/3.png", "/streetfight/images/fighters/subzero/left/attractive-stand-up/4.png", "/streetfight/images/fighters/subzero/left/backward-jump/0.png", "/streetfight/images/fighters/subzero/left/backward-jump/1.png", "/streetfight/images/fighters/subzero/left/backward-jump/2.png", "/streetfight/images/fighters/subzero/left/backward-jump/3.png", "/streetfight/images/fighters/subzero/left/backward-jump/4.png", "/streetfight/images/fighters/subzero/left/backward-jump/5.png", "/streetfight/images/fighters/subzero/left/backward-jump/6.png", "/streetfight/images/fighters/subzero/left/backward-jump/7.png", "/streetfight/images/fighters/subzero/left/backward-jump-kick/0.png", "/streetfight/images/fighters/subzero/left/backward-jump-kick/1.png", "/streetfight/images/fighters/subzero/left/backward-jump-kick/2.png", "/streetfight/images/fighters/subzero/left/backward-jump-punch/0.png", "/streetfight/images/fighters/subzero/left/backward-jump-punch/1.png", "/streetfight/images/fighters/subzero/left/backward-jump-punch/2.png", "/streetfight/images/fighters/subzero/left/blocking/0.png", "/streetfight/images/fighters/subzero/left/blocking/1.png", "/streetfight/images/fighters/subzero/left/blocking/2.png", "/streetfight/images/fighters/subzero/left/endure/0.png", "/streetfight/images/fighters/subzero/left/endure/1.png", "/streetfight/images/fighters/subzero/left/endure/2.png", "/streetfight/images/fighters/subzero/left/fall/0.png", "/streetfight/images/fighters/subzero/left/fall/1.png", "/streetfight/images/fighters/subzero/left/fall/2.png", "/streetfight/images/fighters/subzero/left/fall/3.png", "/streetfight/images/fighters/subzero/left/fall/4.png", "/streetfight/images/fighters/subzero/left/fall/5.png", "/streetfight/images/fighters/subzero/left/fall/6.png", "/streetfight/images/fighters/subzero/left/forward-jump/0.png", "/streetfight/images/fighters/subzero/left/forward-jump/1.png", "/streetfight/images/fighters/subzero/left/forward-jump/2.png", "/streetfight/images/fighters/subzero/left/forward-jump/3.png", "/streetfight/images/fighters/subzero/left/forward-jump/4.png", "/streetfight/images/fighters/subzero/left/forward-jump/5.png", "/streetfight/images/fighters/subzero/left/forward-jump/6.png", "/streetfight/images/fighters/subzero/left/forward-jump/7.png", "/streetfight/images/fighters/subzero/left/forward-jump-kick/0.png", "/streetfight/images/fighters/subzero/left/forward-jump-kick/1.png", "/streetfight/images/fighters/subzero/left/forward-jump-kick/2.png", "/streetfight/images/fighters/subzero/left/forward-jump-punch/0.png", "/streetfight/images/fighters/subzero/left/forward-jump-punch/1.png", "/streetfight/images/fighters/subzero/left/forward-jump-punch/2.png", "/streetfight/images/fighters/subzero/left/high-kick/0.png", "/streetfight/images/fighters/subzero/left/high-kick/1.png", "/streetfight/images/fighters/subzero/left/high-kick/2.png", "/streetfight/images/fighters/subzero/left/high-kick/3.png", "/streetfight/images/fighters/subzero/left/high-kick/4.png", "/streetfight/images/fighters/subzero/left/high-kick/5.png", "/streetfight/images/fighters/subzero/left/high-kick/6.png", "/streetfight/images/fighters/subzero/left/high-punch/0.png", "/streetfight/images/fighters/subzero/left/high-punch/1.png", "/streetfight/images/fighters/subzero/left/high-punch/2.png", "/streetfight/images/fighters/subzero/left/high-punch/3.png", "/streetfight/images/fighters/subzero/left/high-punch/4.png", "/streetfight/images/fighters/subzero/left/high-punch/5.png", "/streetfight/images/fighters/subzero/left/high-punch/6.png", "/streetfight/images/fighters/subzero/left/high-punch/7.png", "/streetfight/images/fighters/subzero/left/jumping/0.png", "/streetfight/images/fighters/subzero/left/jumping/1.png", "/streetfight/images/fighters/subzero/left/jumping/2.png", "/streetfight/images/fighters/subzero/left/jumping/3.png", "/streetfight/images/fighters/subzero/left/jumping/4.png", "/streetfight/images/fighters/subzero/left/jumping/5.png", "/streetfight/images/fighters/subzero/left/knock-down/0.png", "/streetfight/images/fighters/subzero/left/knock-down/1.png", "/streetfight/images/fighters/subzero/left/knock-down/2.png", "/streetfight/images/fighters/subzero/left/knock-down/3.png", "/streetfight/images/fighters/subzero/left/knock-down/4.png", "/streetfight/images/fighters/subzero/left/knock-down/5.png", "/streetfight/images/fighters/subzero/left/knock-down/6.png", "/streetfight/images/fighters/subzero/left/knock-down/7.png", "/streetfight/images/fighters/subzero/left/knock-down/8.png", "/streetfight/images/fighters/subzero/left/knock-down/9.png", "/streetfight/images/fighters/subzero/left/low-kick/0.png", "/streetfight/images/fighters/subzero/left/low-kick/1.png", "/streetfight/images/fighters/subzero/left/low-kick/2.png", "/streetfight/images/fighters/subzero/left/low-kick/3.png", "/streetfight/images/fighters/subzero/left/low-kick/4.png", "/streetfight/images/fighters/subzero/left/low-kick/5.png", "/streetfight/images/fighters/subzero/left/low-punch/0.png", "/streetfight/images/fighters/subzero/left/low-punch/1.png", "/streetfight/images/fighters/subzero/left/low-punch/2.png", "/streetfight/images/fighters/subzero/left/low-punch/3.png", "/streetfight/images/fighters/subzero/left/low-punch/4.png", "/streetfight/images/fighters/subzero/left/spin-kick/0.png", "/streetfight/images/fighters/subzero/left/spin-kick/1.png", "/streetfight/images/fighters/subzero/left/spin-kick/2.png", "/streetfight/images/fighters/subzero/left/spin-kick/3.png", "/streetfight/images/fighters/subzero/left/spin-kick/4.png", "/streetfight/images/fighters/subzero/left/spin-kick/5.png", "/streetfight/images/fighters/subzero/left/spin-kick/6.png", "/streetfight/images/fighters/subzero/left/spin-kick/7.png", "/streetfight/images/fighters/subzero/left/squat-endure/0.png", "/streetfight/images/fighters/subzero/left/squat-endure/1.png", "/streetfight/images/fighters/subzero/left/squat-endure/2.png", "/streetfight/images/fighters/subzero/left/squat-high-kick/0.png", "/streetfight/images/fighters/subzero/left/squat-high-kick/1.png", "/streetfight/images/fighters/subzero/left/squat-high-kick/2.png", "/streetfight/images/fighters/subzero/left/squat-high-kick/3.png", "/streetfight/images/fighters/subzero/left/squat-low-kick/0.png", "/streetfight/images/fighters/subzero/left/squat-low-kick/1.png", "/streetfight/images/fighters/subzero/left/squat-low-kick/2.png", "/streetfight/images/fighters/subzero/left/squat-low-punch/0.png", "/streetfight/images/fighters/subzero/left/squat-low-punch/1.png", "/streetfight/images/fighters/subzero/left/squat-low-punch/2.png", "/streetfight/images/fighters/subzero/left/squating/0.png", "/streetfight/images/fighters/subzero/left/squating/1.png", "/streetfight/images/fighters/subzero/left/squating/2.png", "/streetfight/images/fighters/subzero/left/stand/0.png", "/streetfight/images/fighters/subzero/left/stand/1.png", "/streetfight/images/fighters/subzero/left/stand/2.png", "/streetfight/images/fighters/subzero/left/stand/3.png", "/streetfight/images/fighters/subzero/left/stand/4.png", "/streetfight/images/fighters/subzero/left/stand/5.png", "/streetfight/images/fighters/subzero/left/stand/6.png", "/streetfight/images/fighters/subzero/left/stand/7.png", "/streetfight/images/fighters/subzero/left/stand/8.png", "/streetfight/images/fighters/subzero/left/stand/9.png", "/streetfight/images/fighters/subzero/left/stand-up/0.png", "/streetfight/images/fighters/subzero/left/stand-up/1.png", "/streetfight/images/fighters/subzero/left/stand-up/2.png", "/streetfight/images/fighters/subzero/left/uppercut/0.png", "/streetfight/images/fighters/subzero/left/uppercut/1.png", "/streetfight/images/fighters/subzero/left/uppercut/2.png", "/streetfight/images/fighters/subzero/left/uppercut/3.png", "/streetfight/images/fighters/subzero/left/uppercut/4.png", "/streetfight/images/fighters/subzero/left/walking/0.png", "/streetfight/images/fighters/subzero/left/walking/1.png", "/streetfight/images/fighters/subzero/left/walking/2.png", "/streetfight/images/fighters/subzero/left/walking/3.png", "/streetfight/images/fighters/subzero/left/walking/4.png", "/streetfight/images/fighters/subzero/left/walking/5.png", "/streetfight/images/fighters/subzero/left/walking/6.png", "/streetfight/images/fighters/subzero/left/walking/7.png", "/streetfight/images/fighters/subzero/left/walking/8.png", "/streetfight/images/fighters/subzero/left/walking-backward/0.png", "/streetfight/images/fighters/subzero/left/walking-backward/1.png", "/streetfight/images/fighters/subzero/left/walking-backward/2.png", "/streetfight/images/fighters/subzero/left/walking-backward/3.png", "/streetfight/images/fighters/subzero/left/walking-backward/4.png", "/streetfight/images/fighters/subzero/left/walking-backward/5.png", "/streetfight/images/fighters/subzero/left/walking-backward/6.png", "/streetfight/images/fighters/subzero/left/walking-backward/7.png", "/streetfight/images/fighters/subzero/left/walking-backward/8.png", "/streetfight/images/fighters/subzero/left/win/0.png", "/streetfight/images/fighters/subzero/left/win/1.png", "/streetfight/images/fighters/subzero/left/win/2.png", "/streetfight/images/fighters/subzero/left/win/3.png", "/streetfight/images/fighters/subzero/left/win/4.png", "/streetfight/images/fighters/subzero/left/win/5.png", "/streetfight/images/fighters/subzero/left/win/6.png", "/streetfight/images/fighters/subzero/left/win/7.png", "/streetfight/images/fighters/subzero/left/win/8.png", "/streetfight/images/fighters/subzero/left/win/9.png", "/streetfight/images/fighters/subzero/right/attractive-stand-up/0.png", "/streetfight/images/fighters/subzero/right/attractive-stand-up/1.png", "/streetfight/images/fighters/subzero/right/attractive-stand-up/2.png", "/streetfight/images/fighters/subzero/right/attractive-stand-up/3.png", "/streetfight/images/fighters/subzero/right/attractive-stand-up/4.png", "/streetfight/images/fighters/subzero/right/backward-jump/0.png", "/streetfight/images/fighters/subzero/right/backward-jump/1.png", "/streetfight/images/fighters/subzero/right/backward-jump/2.png", "/streetfight/images/fighters/subzero/right/backward-jump/3.png", "/streetfight/images/fighters/subzero/right/backward-jump/4.png", "/streetfight/images/fighters/subzero/right/backward-jump/5.png", "/streetfight/images/fighters/subzero/right/backward-jump/6.png", "/streetfight/images/fighters/subzero/right/backward-jump/7.png", "/streetfight/images/fighters/subzero/right/backward-jump-kick/0.png", "/streetfight/images/fighters/subzero/right/backward-jump-kick/1.png", "/streetfight/images/fighters/subzero/right/backward-jump-kick/2.png", "/streetfight/images/fighters/subzero/right/backward-jump-punch/0.png", "/streetfight/images/fighters/subzero/right/backward-jump-punch/1.png", "/streetfight/images/fighters/subzero/right/backward-jump-punch/2.png", "/streetfight/images/fighters/subzero/right/blocking/0.png", "/streetfight/images/fighters/subzero/right/blocking/1.png", "/streetfight/images/fighters/subzero/right/blocking/2.png", "/streetfight/images/fighters/subzero/right/endure/0.png", "/streetfight/images/fighters/subzero/right/endure/1.png", "/streetfight/images/fighters/subzero/right/endure/2.png", "/streetfight/images/fighters/subzero/right/fall/0.png", "/streetfight/images/fighters/subzero/right/fall/1.png", "/streetfight/images/fighters/subzero/right/fall/2.png", "/streetfight/images/fighters/subzero/right/fall/3.png", "/streetfight/images/fighters/subzero/right/fall/4.png", "/streetfight/images/fighters/subzero/right/fall/5.png", "/streetfight/images/fighters/subzero/right/fall/6.png", "/streetfight/images/fighters/subzero/right/forward-jump/0.png", "/streetfight/images/fighters/subzero/right/forward-jump/1.png", "/streetfight/images/fighters/subzero/right/forward-jump/2.png", "/streetfight/images/fighters/subzero/right/forward-jump/3.png", "/streetfight/images/fighters/subzero/right/forward-jump/4.png", "/streetfight/images/fighters/subzero/right/forward-jump/5.png", "/streetfight/images/fighters/subzero/right/forward-jump/6.png", "/streetfight/images/fighters/subzero/right/forward-jump/7.png", "/streetfight/images/fighters/subzero/right/forward-jump-kick/0.png", "/streetfight/images/fighters/subzero/right/forward-jump-kick/1.png", "/streetfight/images/fighters/subzero/right/forward-jump-kick/2.png", "/streetfight/images/fighters/subzero/right/forward-jump-punch/0.png", "/streetfight/images/fighters/subzero/right/forward-jump-punch/1.png", "/streetfight/images/fighters/subzero/right/forward-jump-punch/2.png", "/streetfight/images/fighters/subzero/right/high-kick/0.png", "/streetfight/images/fighters/subzero/right/high-kick/1.png", "/streetfight/images/fighters/subzero/right/high-kick/2.png", "/streetfight/images/fighters/subzero/right/high-kick/3.png", "/streetfight/images/fighters/subzero/right/high-kick/4.png", "/streetfight/images/fighters/subzero/right/high-kick/5.png", "/streetfight/images/fighters/subzero/right/high-kick/6.png", "/streetfight/images/fighters/subzero/right/high-punch/0.png", "/streetfight/images/fighters/subzero/right/high-punch/1.png", "/streetfight/images/fighters/subzero/right/high-punch/2.png", "/streetfight/images/fighters/subzero/right/high-punch/3.png", "/streetfight/images/fighters/subzero/right/high-punch/4.png", "/streetfight/images/fighters/subzero/right/high-punch/5.png", "/streetfight/images/fighters/subzero/right/high-punch/6.png", "/streetfight/images/fighters/subzero/right/high-punch/7.png", "/streetfight/images/fighters/subzero/right/jumping/0.png", "/streetfight/images/fighters/subzero/right/jumping/1.png", "/streetfight/images/fighters/subzero/right/jumping/2.png", "/streetfight/images/fighters/subzero/right/jumping/3.png", "/streetfight/images/fighters/subzero/right/jumping/4.png", "/streetfight/images/fighters/subzero/right/jumping/5.png", "/streetfight/images/fighters/subzero/right/knock-down/0.png", "/streetfight/images/fighters/subzero/right/knock-down/1.png", "/streetfight/images/fighters/subzero/right/knock-down/2.png", "/streetfight/images/fighters/subzero/right/knock-down/3.png", "/streetfight/images/fighters/subzero/right/knock-down/4.png", "/streetfight/images/fighters/subzero/right/knock-down/5.png", "/streetfight/images/fighters/subzero/right/knock-down/6.png", "/streetfight/images/fighters/subzero/right/knock-down/7.png", "/streetfight/images/fighters/subzero/right/knock-down/8.png", "/streetfight/images/fighters/subzero/right/knock-down/9.png", "/streetfight/images/fighters/subzero/right/low-kick/0.png", "/streetfight/images/fighters/subzero/right/low-kick/1.png", "/streetfight/images/fighters/subzero/right/low-kick/2.png", "/streetfight/images/fighters/subzero/right/low-kick/3.png", "/streetfight/images/fighters/subzero/right/low-kick/4.png", "/streetfight/images/fighters/subzero/right/low-kick/5.png", "/streetfight/images/fighters/subzero/right/low-punch/0.png", "/streetfight/images/fighters/subzero/right/low-punch/1.png", "/streetfight/images/fighters/subzero/right/low-punch/2.png", "/streetfight/images/fighters/subzero/right/low-punch/3.png", "/streetfight/images/fighters/subzero/right/low-punch/4.png", "/streetfight/images/fighters/subzero/right/spin-kick/0.png", "/streetfight/images/fighters/subzero/right/spin-kick/1.png", "/streetfight/images/fighters/subzero/right/spin-kick/2.png", "/streetfight/images/fighters/subzero/right/spin-kick/3.png", "/streetfight/images/fighters/subzero/right/spin-kick/4.png", "/streetfight/images/fighters/subzero/right/spin-kick/5.png", "/streetfight/images/fighters/subzero/right/spin-kick/6.png", "/streetfight/images/fighters/subzero/right/spin-kick/7.png", "/streetfight/images/fighters/subzero/right/squat-endure/0.png", "/streetfight/images/fighters/subzero/right/squat-endure/1.png", "/streetfight/images/fighters/subzero/right/squat-endure/2.png", "/streetfight/images/fighters/subzero/right/squat-high-kick/0.png", "/streetfight/images/fighters/subzero/right/squat-high-kick/1.png", "/streetfight/images/fighters/subzero/right/squat-high-kick/2.png", "/streetfight/images/fighters/subzero/right/squat-high-kick/3.png", "/streetfight/images/fighters/subzero/right/squat-low-kick/0.png", "/streetfight/images/fighters/subzero/right/squat-low-kick/1.png", "/streetfight/images/fighters/subzero/right/squat-low-kick/2.png", "/streetfight/images/fighters/subzero/right/squat-low-punch/0.png", "/streetfight/images/fighters/subzero/right/squat-low-punch/1.png", "/streetfight/images/fighters/subzero/right/squat-low-punch/2.png", "/streetfight/images/fighters/subzero/right/squating/0.png", "/streetfight/images/fighters/subzero/right/squating/1.png", "/streetfight/images/fighters/subzero/right/squating/2.png", "/streetfight/images/fighters/subzero/right/stand/0.png", "/streetfight/images/fighters/subzero/right/stand/1.png", "/streetfight/images/fighters/subzero/right/stand/2.png", "/streetfight/images/fighters/subzero/right/stand/3.png", "/streetfight/images/fighters/subzero/right/stand/4.png", "/streetfight/images/fighters/subzero/right/stand/5.png", "/streetfight/images/fighters/subzero/right/stand/6.png", "/streetfight/images/fighters/subzero/right/stand/7.png", "/streetfight/images/fighters/subzero/right/stand/8.png", "/streetfight/images/fighters/subzero/right/stand-up/0.png", "/streetfight/images/fighters/subzero/right/stand-up/1.png", "/streetfight/images/fighters/subzero/right/stand-up/2.png", "/streetfight/images/fighters/subzero/right/uppercut/0.png", "/streetfight/images/fighters/subzero/right/uppercut/1.png", "/streetfight/images/fighters/subzero/right/uppercut/2.png", "/streetfight/images/fighters/subzero/right/uppercut/3.png", "/streetfight/images/fighters/subzero/right/uppercut/4.png", "/streetfight/images/fighters/subzero/right/walking/0.png", "/streetfight/images/fighters/subzero/right/walking/1.png", "/streetfight/images/fighters/subzero/right/walking/2.png", "/streetfight/images/fighters/subzero/right/walking/3.png", "/streetfight/images/fighters/subzero/right/walking/4.png", "/streetfight/images/fighters/subzero/right/walking/5.png", "/streetfight/images/fighters/subzero/right/walking/6.png", "/streetfight/images/fighters/subzero/right/walking/7.png", "/streetfight/images/fighters/subzero/right/walking/8.png", "/streetfight/images/fighters/subzero/right/walking/subzero-walking-b.gif", "/streetfight/images/fighters/subzero/right/walking-backward/0.png", "/streetfight/images/fighters/subzero/right/walking-backward/1.png", "/streetfight/images/fighters/subzero/right/walking-backward/2.png", "/streetfight/images/fighters/subzero/right/walking-backward/3.png", "/streetfight/images/fighters/subzero/right/walking-backward/4.png", "/streetfight/images/fighters/subzero/right/walking-backward/5.png", "/streetfight/images/fighters/subzero/right/walking-backward/6.png", "/streetfight/images/fighters/subzero/right/walking-backward/7.png", "/streetfight/images/fighters/subzero/right/walking-backward/8.png", "/streetfight/images/fighters/subzero/right/walking-backward/subzero-walking-f.gif", "/streetfight/images/fighters/subzero/right/win/0.png", "/streetfight/images/fighters/subzero/right/win/1.png", "/streetfight/images/fighters/subzero/right/win/2.png", "/streetfight/images/fighters/subzero/right/win/3.png", "/streetfight/images/fighters/subzero/right/win/4.png", "/streetfight/images/fighters/subzero/right/win/5.png", "/streetfight/images/fighters/subzero/right/win/6.png", "/streetfight/images/fighters/subzero/right/win/7.png", "/streetfight/images/fighters/subzero/right/win/8.png", "/streetfight/images/fighters/subzero/right/win/9.png"])
                            await this.createScene();
                            setInterval(() => {
                                this._ws.send(JSON.stringify({
                                    action: "ping",
                                }))
                            }, 10000)
                            callback(true, "")
                            this._join_status = true;
                            let lc = new LocalChannel();
                            lc.create_channel(this._roomId + data.id)
                            $("#mic").click(() => {
                                if ($("#mic").attr("src") == "icons/mmicrophone.png") {
                                    console.log("unmute")
                                    lc.unmute()
                                    $("#mic").attr("src", "icons/microphone.png");
                                } else {
                                    console.log("mute")
                                    lc.mute()
                                    $("#mic").attr("src", "icons/mmicrophone.png")
                                }
                            });
                        }
                        this._color = new BABYLON.Color3(data.rgb[0], data.rgb[1], data.rgb[2])
                        let mat: PBRMaterial = this._scene.getMaterialByName("body")
                        let mat1: PBRMaterial = this._scene.getMaterialByName("skin")
                        mat.albedoColor = this._color
                        mat1.albedoColor = this._color
                        console.log("Room joined sucessfully...")
                    } else if (data.response == "rgb") {
                        this._rcolor[data.id] = data.rgb
                        if (this._playerList.hasOwnProperty(data.id)) {
                            this._playerList[data.id].setColor(data.rgb)
                        }
                    }
                } else {
                    let buf = Buffer.from(data)
                    let a = buf[0]
                    let response = ((1 << 2) - 1) & a;
                    let id = (a >> 2);
                    if (response == 1) {

                        if (!this._playerList.hasOwnProperty(id)) {
                            await this.createRemotePlayer(id)
                        }
                        let p: RemoteCharacterController = this._playerList[id]

                        p._avatar.position.x = this.extractFloatPos(buf.slice(1, 4))
                        p._avatar.position.z = this.extractFloatPos(buf.slice(4, 7))
                    } else if (response == 0) {
                        if (this._playerList.hasOwnProperty(id)) {
                            let p: RemoteCharacterController = this._playerList[id]
                            let x = this.extractFloat(buf.slice(1, 3))
                            let y = this.extractFloat(buf.slice(3, 5))
                            let z = this.extractFloat(buf.slice(5, 7))
                            let ang = this.extractFloatAng(buf.slice(7, 10))
                            p.setMoveData(new BABYLON.Vector3(x, y, z))
                            p._avatar.rotation.y = ang;
                        }
                    } else if (response == 3) {
                        if (this._playerList.hasOwnProperty(id)) {
                            let p: RemoteCharacterController = this._playerList[id]
                            p._avatar.dispose()
                            delete this._playerList[id]
                        }
                    }


                }
            }

            return new Promise((resolve, reject) => {
                this._ws.onopen = () => {
                    console.log("Websocket Connection Opened!")
                    this._ws.send(JSON.stringify({
                        action: "join",
                        //set it to dynamic
                        room: this._roomId
                    }))
                    resolve();
                };
            });

        } catch (e) {
            console.error(e)
        }
    }


    async createScene() {
        // Create a basic BJS Scene object.

        // Create a FreeCamera, and set its position to (x:0, y:5, z:-10).
        this._camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", (Math.PI / 2 + this._player.rotation.y), Math.PI / 2.5, 5, new BABYLON.Vector3(this._player.position.x, this._player.position.y + 1.5, this._player.position.z), this._scene);

        this._camera.wheelPrecision = 15;
        this._camera.checkCollisions = false;
        //make sure the keyboard keys controlling camera are different from those controlling player
        //here we will not use any keyboard keys to control camera
        this._camera.keysLeft = [];
        this._camera.keysRight = [];
        this._camera.keysUp = [];
        this._camera.keysDown = [];
        //how close can the camera come to player
        this._camera.lowerRadiusLimit = 2;
        //how far can the camera go from the player
        this._camera.upperRadiusLimit = 20;
        this._camera.attachControl(this._canvas, false);

        this.createCC()
        // Create a basic light, aiming 0,1,0 - meaning, to the sky.
        this._light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), this._scene);

        var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {
            size: 1000.0
        }, this._scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this._scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("gallexy/", this._scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        skybox.material = skyboxMaterial;

        var gl = new BABYLON.GlowLayer("glow", this._scene);
        gl.intensity = 0.4;


        var ssr = new BABYLON.ScreenSpaceReflectionPostProcess("ssr", this._scene, 1.0, this._camera);

        let alpha = 0;
        // let beta=Date.now();
        //let gamma = Date.now()
        this._scene.registerBeforeRender(() => {
            skybox.rotation.y = alpha;
            //  if(Date.now()-beta>=10000){
            //sync location
            // beta = Date.now()
            //let buf_list = [this.compressFloatPos(this._player.position.x), this.compressFloatPos(this._player.position.z) ]
            //this._ws.send(Buffer.concat(buf_list))        
            // }
            if (this._cc._moveVector && this._cc.anyMovement() && (this._cc._act._walk || this._cc._act._walkback || this._cc._act._stepLeft || this._cc._act._stepRight)) {

                let tmp = this._cc._moveVector
                this._ws.send(Buffer.concat([this.compressFloat(tmp.x), this.compressFloat(tmp.y), this.compressFloat(tmp.z), this.compressFloatAng(this._player.rotation.y % 360)]))

                let buf_list = [this.compressFloatPos(this._player.position.x), this.compressFloatPos(this._player.position.z)]
                this._ws.send(Buffer.concat(buf_list))

            } 
            alpha += 0.001;
        });

        await this.loadMeshes()
        this.test()
    }

    async fetchInitiaWins() {
        let bn = await web3.eth.getBlockNumber()
        console.log("BlockNumber:" + bn)
        const query = gql `{
            games(where: { startblock_gt: ${bn-310}}){
              id
              token0
              token1
              startblock
              particiapte0 {
                  id
                }
                participate1 {
                  id
                }
              winner {
                id
              }
            }
          }
        `
        let data = await request('https://cello-graphnode.overclockedbrains.co/subgraphs/name/MetaBulls', query)
        console.log(JSON.stringify(data))
        for (let m of data["games"]) {
            let d1 = await this.get_nft(m.token0)
            let d2 = await this.get_nft(m.token1)
            var img1 = new Image();
            img1.src = `https://${d1[0]}.ipfs.infura-ipfs.io/`;
            await this.loadimage(img1)

            var img2 = new Image();
            img2.src = `https://${d2[0]}.ipfs.infura-ipfs.io/`;
            await this.loadimage(img2)

            this._winnerquee.push(Number(m.startblock))
            this._winnerdata[Number(m.startblock)] = {
                "p1": m.token0,
                "p2": m.token1,
                "img1": img1,
                "img2": img2,
                "uimg1": d1[0],
                "uimg2": d2[0],
                "strength1": d1[1][0],
                "strength2": d2[1][0],
                "stemina1": d1[1][1],
                "stemina2": d2[1][1],
                "id": m.id,
                "addr1": m['particiapte0']['id'],
                "addr2": m['participate1']['id'],
                "winner": m['winner'] ? (m['winner']['id'] ? 0 : 1) : "NC"
            }
            this._winnerquee.sort(function (a, b) {
                return a - b;
            });
            this._winnerquee = this._winnerquee.filter((item, pos) => {
                return this._winnerquee.indexOf(item) == pos;
            })
        }
        this.relist_winner()
    }

    async fetchInitiaMatches() {
        let bn = await web3.eth.getBlockNumber()
        console.log("BlockNumber:" + bn)
        const query = gql `{
            games(where: {startblock_gt:${bn}}){
        
          id
          token0
            token1
            startblock
            particiapte0 {
                id
              }
              participate1 {
                id
              }
          }
        }
        `
        let data = await request('https://cello-graphnode.overclockedbrains.co/subgraphs/name/MetaBulls', query)
        console.log(JSON.stringify(data))
        for (let m of data["games"]) {
            let d1 = await this.get_nft(m.token0)
            let d2 = await this.get_nft(m.token1)
            var img1 = new Image();
            img1.src = `https://${d1[0]}.ipfs.infura-ipfs.io/`;
            await this.loadimage(img1)

            var img2 = new Image();
            img2.src = `https://${d2[0]}.ipfs.infura-ipfs.io/`;
            await this.loadimage(img2)

            this._matchquee.push(Number(m.startblock))
            this._matchdata[Number(m.startblock)] = {
                "p1": m.token0,
                "p2": m.token1,
                "img1": img1,
                "img2": img2,
                "uimg1": d1[0],
                "uimg2": d2[0],
                "strength1": d1[1][0],
                "strength2": d2[1][0],
                "stemina1": d1[1][1],
                "stemina2": d2[1][1],
                "id": m.id,
                "addr1": m['particiapte0']['id'],
                "addr2": m['participate1']['id']
            }
            this._matchquee.sort(function (a, b) {
                return a - b;
            });
            this._matchquee = this._matchquee.filter((item, pos) => {
                return this._matchquee.indexOf(item) == pos;
            })
        }
        this.relist_match()
    }


    startRenderLoop() {
        this.fetchInitiaMatches()
        this.fetchInitiaWins()
        workerTimers.setInterval(async () => {
            if (this._queue_state && this._queue.length > 0) {
                this._queue_state = false;
                try {
                    let result = this._queue.shift()
                    this._currentBlock = result.number
                    console.log(result.number)
                    let rnum = parseInt("0x" + result.hash.slice(result.hash.length - 6)) % 8;
                    let player = result.number % 2 == 0 ? 0 : 1;
                    if (Object.keys(this._matches).length === 0 && this._matchquee.length > 0 && result.number == this._matchquee[0]) {
                        if (this.mainCanvas) {
                            idelcv.stop()
                            this.mainCanvas = null
                        }
                        await this.startStreetFightGame(this._currentBlock)
                    }

                    for (let m in this._matches) {

                        let gm = this._matches[m].gm
                        if (this._matchquee.length > 0 && result.number == this._matchquee[0]) {
                            gm.reset()
                            await this.startStreetFightGame(this._currentBlock)
                        }

                        let _keydown = gm.controllers.Multiplayer.prototype._keydown.bind(gm.game)
                        let _keyup = gm.controllers.Multiplayer.prototype._keyup.bind(gm.game)
                        console.log("Move:" + rnum + " Player:" + player)

                        let mypromise = null
                        if (!this._matches[m].finished) {
                            mypromise = new Promise((myResolve, myReject) => {
                                try {
                                    if (rnum == 0) {
                                        if (player) {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(65)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(65)
                                                this._matches[m][1].damage += this._matches[m][0].strength + 100
                                                this._matches[m][0].strength -= 5
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(80)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(80)
                                                this._matches[m][0].damage += this._matches[m][1].strength + 100
                                                this._matches[m][1].strength -= 5
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else if (rnum == 1) {
                                        if (player) {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(70)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(70)
                                                this._matches[m][1].damage += this._matches[m][0].stemina + 110
                                                this._matches[m][0].stemina -= 7
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(220)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(220)
                                                this._matches[m][0].damage += this._matches[m][1].stemina + 110
                                                this._matches[m][1].stemina -= 7
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else if (rnum == 2) {
                                        if (player) {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(83)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(83)
                                                this._matches[m][1].damage += this._matches[m][0].strength + 90
                                                this._matches[m][0].strength -= 4
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(219)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(219)
                                                this._matches[m][0].damage += this._matches[m][1].strength + 90
                                                this._matches[m][1].strength -= 4
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else if (rnum == 3) {
                                        if (player) {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(68)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(68)
                                                this._matches[m][1].damage += this._matches[m][0].stemina + 95
                                                this._matches[m][0].stemina -= 8
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(221)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(221)
                                                this._matches[m][0].damage += this._matches[m][1].stemina + 95
                                                this._matches[m][1].stemina -= 8
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else if (rnum == 4) {
                                        if (player) {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(65)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(65)
                                                this._matches[m][1].damage += this._matches[m][0].strength + 130
                                                this._matches[m][0].strength -= 15
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            var intervalId = workerTimers.setInterval(() => {
                                                _keydown(80)
                                            }, 35);
                                            workerTimers.setTimeout(() => {
                                                workerTimers.clearInterval(intervalId);
                                                _keyup(80)
                                                this._matches[m][0].damage += this._matches[m][1].strength + 130
                                                this._matches[m][1].strength -= 15
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else if (rnum == 5) {
                                        if (player) {
                                            _keydown(72)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(70)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(70)
                                                    this._matches[m][1].damage += this._matches[m][0].stemina + 111
                                                    this._matches[m][0].stemina -= 11

                                                }, 1512)
                                            }, 250)
                                            workerTimers.setTimeout(() => {
                                                _keyup(72)
                                                myResolve()
                                            }, 2697)
                                        } else {
                                            _keydown(40)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(220)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(220)
                                                    this._matches[m][0].damage += this._matches[m][1].stemina + 111
                                                    this._matches[m][1].stemina -= 11
                                                }, 1512)
                                            }, 250)
                                            workerTimers.setTimeout(() => {
                                                _keyup(40)
                                                myResolve()
                                            }, 2697)
                                        }
                                    } else if (rnum == 6) {
                                        if (player) {
                                            _keydown(72)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(83)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(83)
                                                    this._matches[m][1].damage += this._matches[m][0].strength + 80
                                                    this._matches[m][0].strength -= 3
                                                }, 1222)
                                            }, 294)
                                            workerTimers.setTimeout(() => {
                                                _keyup(72)
                                                myResolve()
                                            }, 1831)
                                        } else {
                                            _keydown(40)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(219)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(219)
                                                    this._matches[m][0].damage += this._matches[m][1].strength + 80
                                                    this._matches[m][1].strength -= 3
                                                }, 1222)
                                            }, 294)
                                            workerTimers.setTimeout(() => {
                                                _keyup(40)
                                                myResolve()
                                            }, 1831)
                                        }
                                    } else if (rnum == 7) {
                                        if (player) {
                                            _keydown(72)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(68)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(68)
                                                    this._matches[m][1].damage += this._matches[m][0].stemina + 100
                                                    this._matches[m][0].stemina -= 9
                                                }, 1405)
                                            }, 250)
                                            workerTimers.setTimeout(() => {
                                                _keyup(72)
                                                myResolve()
                                            }, 2000)
                                        } else {
                                            _keydown(40)
                                            workerTimers.setTimeout(() => {
                                                var intervalId = workerTimers.setInterval(() => {
                                                    _keydown(221)
                                                }, 35);
                                                workerTimers.setTimeout(() => {
                                                    workerTimers.clearInterval(intervalId);
                                                    _keyup(221)
                                                    this._matches[m][0].damage += this._matches[m][1].stemina + 100
                                                    this._matches[m][1].stemina -= 9
                                                }, 1405)
                                            }, 250)
                                            workerTimers.setTimeout(() => {
                                                _keyup(40)
                                                myResolve()
                                            }, 2000)
                                        }
                                    } else {
                                        myResolve()
                                    }
                                } catch (e) {
                                    myResolve()
                                }
                            })
                        }
                        if (mypromise != null) {
                            await mypromise
                        }

                        if (!this._matches[m].finished && result.number >= this._matchquee[0] + 20) {
                            let gm = this._matches[m].gm
                            this._matches[m].finished = true
                            this._winnerquee.push(this._matchquee[0])
                            let winner = 0;
                            if (this._matches[m][0].damage > this._matches[m][1].damage) {
                                winner = 1;
                            }
                            this._matchdata[this._matchquee[0]]['winner'] = winner
                            this._winnerdata[this._matchquee[0]] = this._matchdata[this._matchquee[0]]
                            delete this._matchdata[this._matchquee.shift()]
                            this.relist_winner()
                            this.relist_match()
                            workerTimers.setTimeout(() => {
                                if (winner) {
                                    gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[0])("fall")
                                    gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[1])("win")
                                } else {
                                    gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[1])("fall")
                                    gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[0])("win")
                                }
                            }, 4000)
                        }
                    }

                } catch (e) {
                    console.error("MarkTheLOg:" + e)
                }
                this._queue_state = true
            }
        }, 500)
        web3.eth.subscribe('newBlockHeaders', async (error, result) => {
            if (!error) {
                /* mk.controllers.keys.p1 = {
                    RIGHT: 74,
                    LEFT : 71,
                    UP   : 89,
                    DOWN : 72,
                    BLOCK: 16,
                    HP   : 65,
                    LP   : 83,
                    LK   : 68,
                    HK   : 70
                  };
                
                  mk.controllers.keys.p2 = {
                    RIGHT: 39,
                    LEFT : 37,
                    UP   : 38,
                    DOWN : 40,
                    BLOCK: 17,
                    HP   : 80,
                    LP   : 219,
                    LK   : 221,
                    HK   : 220
                  };*/
                this._queue.push(result)
                return;
            }

            console.error(error);
        })

        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }

    compressFloat(val) {
        const buf = Buffer.alloc(2)
        ieee754.write(buf, val, 0, true, 15, 2)
        return buf;
    }

    extractFloat(buf) {
        const num = ieee754.read(buf, 0, true, 15, 2)
        return num;
    }

    compressFloatAng(val) {
        const buf = Buffer.alloc(3)
        ieee754.write(buf, val, 0, true, 16, 3)
        return buf;
    }

    extractFloatAng(buf) {
        const num = ieee754.read(buf, 0, true, 16, 3)
        return num;
    }

    extractFloatPos(buf) {
        const num = ieee754.read(buf, 0, true, 16, 3)
        return num;
    }

    compressFloatPos(val) {
        const buf = Buffer.alloc(3)
        ieee754.write(buf, val, 0, true, 16, 3)
        return buf;
    }


    async create_screen(id, position: BABYLON.Vector3, rotation) {
        //$( 'body' ).append( `<video id="videojs-theta-plugin-player_${id}" class="video-js vjs-default-skin" controls="" playsinline="" hidden></video>`);
        let videoMat = new BABYLON.StandardMaterial("textVid_1", this._scene);
        videoMat.backFaceCulling = false;
        videoMat.specularColor = new BABYLON.Color3(255, 0, 0);
        videoMat.roughness = 1;


        var txt = new BABYLON.DynamicTexture(`canvas_sc`, {
            width: 600,
            height: 400
        }, this._scene);


        let screen = this._scene.getMeshByName('canvas_screen')
        let new_screen = screen.clone(`screen.${id}`);
        new_screen.checkCollisions = false;
        new_screen.position = position;
        new_screen.rotate(new BABYLON.Vector3(0, 1, 0), rotation, 0);
        videoMat.diffuseTexture = txt
        new_screen.material = videoMat

        var ctx = txt.getContext();



        let drawData = (line, type, data) => {
            try {

                let w = type * 300
                let h = 84
                h = line * h + 5;

                ctx.drawImage(data[0]['img'], 5 + w, 5 + h, 64, 64);


                ctx.font = '10px niko';
                ctx.fillStyle = "yellow";
                ctx.fillText("Strength", 71 + w, 11 + h);
                ctx.fillStyle = "white";
                ctx.fillText(data[0]['strength'], 71 + w, 11 + h + 1 + 10);


                ctx.font = '10px niko';
                ctx.fillStyle = "green";
                ctx.fillText("Stemina", 71 + w, 11 + h + 1 + 10 + 2 + 10);
                ctx.fillStyle = "white";
                ctx.fillText(data[0]['stemina'], 71 + w, 11 + h + 1 + 10 + 2 + 10 + 1 + 10);

                ctx.fillStyle = "orange";
                ctx.font = '8px niko';
                ctx.fillText("VS", 71 + w + 70, h + 32);



                ctx.drawImage(data[1]['img'], 160 + w, 5 + h, 64, 64);

                ctx.font = '10px niko';
                ctx.fillStyle = "yellow";
                ctx.fillText("Strength", 160 + 66 + w, 11 + h);
                ctx.fillStyle = "white";
                ctx.fillText(data[1]['strength'], 160 + 66 + w, 11 + h + 1 + 10);

                ctx.font = '10px niko';
                ctx.fillStyle = "green";
                ctx.fillText("Stemina", 160 + 66 + w, 11 + h + 1 + 10 + 2 + 10);
                ctx.fillStyle = "white";
                ctx.fillText(data[1]['stemina'], 160 + 66 + w, 11 + h + 1 + 10 + 2 + 10 + 1 + 10);


                ctx.font = '12px niko';
                ctx.fillStyle = "#00cbeb";
                let dx = `Block: ${data['blocknum']}`
                ctx.fillText(dx, w + 15, h + 75);

                if (!type) {
                    ctx.font = '12px niko';
                    ctx.fillStyle = "#ff179a";
                    dx = `Winner: NFT-${data['winner']}`
                    ctx.fillText(dx, w + 150, h + 75);
                }
            } catch (e) {}
        }

        let ctx1 = this.brdcanvas.getContext();

        this._scene.registerBeforeRender(() => {
            ctx1.fillStyle = "black";
            ctx1.fillRect(0, 0, 512, 256);

            ctx1.font = '70px niko';
            ctx1.fillStyle = "white";
            ctx1.fillText("#" + this._currentBlock, 20, 120);

            this.brdcanvas.update()


            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, 600, 400);
            ctx.beginPath();
            ctx.moveTo(300, 0);
            ctx.lineTo(300, 400);
            ctx.strokeStyle = "#1500ff";
            ctx.lineWidth = 1;
            ctx.stroke();
            let i = 0
            for (let b of this._matchquee) {
                if (i > 7) {
                    break;
                }
                let data = this._matchdata[b]
                /*
                {
                    "p1":m.token0,
                    "p2":m.token1,
                    "img1":d1[0],
                    "img2": d2[0],
                     "strength1":d1[1][0],
                     "strength2":d2[1][0],
                     "stemina1":d1[1][1],
                     "stemina2":d2[1][1]
                }
                */
                drawData(i, 1, {
                    0: {
                        img: data['img1'],
                        stemina: data['stemina1'],
                        strength: data['strength1']
                    },
                    1: {
                        img: data['img2'],
                        stemina: data['stemina2'],
                        strength: data['strength2']
                    },
                    blocknum: b
                })
                i++;
            }
            i = 0;
            for (let b of this._winnerquee) {
                if (i > 7) {
                    break;
                }
                let data = this._winnerdata[b]
                /*
                {
                    "p1":m.token0,
                    "p2":m.token1,
                    "img1":d1[0],
                    "img2": d2[0],
                     "strength1":d1[1][0],
                     "strength2":d2[1][0],
                     "stemina1":d1[1][1],
                     "stemina2":d2[1][1]
                }
                */
                drawData(i, 0, {
                    0: {
                        img: data['img1'],
                        stemina: data['stemina1'],
                        strength: data['strength1']
                    },
                    1: {
                        img: data['img2'],
                        stemina: data['stemina2'],
                        strength: data['strength2']
                    },
                    blocknum: b,
                    winner: data['winner']
                })
                i++;
            }


            txt.update()
        })



        /*let ellipsoid = this.drawEllipsoid(new_screen, `ellip_screen_${id}`, 20, 25, 10, true)
        ellipsoid.actionManager = new BABYLON.ActionManager(this._scene);
        ellipsoid.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: this._scene.getMeshByName("__ellipsoid__"),
                },
                () => {

                    console.log(`screen_${id} collide`)
                },
            ),

        );
        ellipsoid.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
                    parameter: this._scene.getMeshByName("__ellipsoid__"),
                },
                () => {

                    console.log(`screen_${id} collision exited`)
                },
            ),
        );*/


    }
    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }


    async startStreetFightGame(id) {
        let myPromise = new Promise((myResolve, myReject) => {

            var txt = new BABYLON.DynamicTexture(`canvas_${id}`, {
                width: 600,
                height: 400
            }, this._scene);
            this._scene.getMaterialByName("textVid").diffuseTexture = txt
            var options = {
                arena: {
                    canvas: txt,
                    arena: 0,
                    width: 600,
                    height: 400
                },
                fighters: [{
                    name: 'kano'
                }, {
                    name: 'subzero'
                }],
                callbacks: {
                    attack: function (f, o, l) {}

                },
                gameName: 'test',
                gameType: 'multiplayer'
            };
            let gm = fgm()
            gm.start(options).ready(() => {
                setTimeout(async () => {
                    /* mk.controllers.keys.p1 = {
                         RIGHT: 74,
                         LEFT : 71,
                         UP   : 89,
                         DOWN : 72,
                         BLOCK: 16,
                         HP   : 65,
                         LP   : 83,
                         LK   : 68,
                         HK   : 70
                       };
                     
                       mk.controllers.keys.p2 = {
                         RIGHT: 39,
                         LEFT : 37,
                         UP   : 38,
                         DOWN : 40,
                         BLOCK: 17,
                         HP   : 80,
                         LP   : 219,
                         LK   : 221,
                         HK   : 220
                       };*/


                    let _keydown = gm.controllers.Multiplayer.prototype._keydown.bind(gm.game)
                    let _keyup = gm.controllers.Multiplayer.prototype._keyup.bind(gm.game)
                    var img0 = new Image();
                    img0.src = `https://${ this._matchdata[this._matchquee[0]]["uimg1"]}.ipfs.infura-ipfs.io/`;
                    await this.loadimage(img0)

                    var img1 = new Image();
                    img1.src = `https://${this._matchdata[this._matchquee[0]]["uimg2"]}.ipfs.infura-ipfs.io/`;
                    await this.loadimage(img1)

                    setTimeout(() => {
                        /*{
                            "p1": m.token0,
                            "p2": m.token1,
                            "img1": img1,
                            "img2": img2,
                            "uimg1": d1[0],
                            "uimg2": d2[0],
                            "strength1": d1[1][0],
                            "strength2": d2[1][0],
                            "stemina1": d1[1][1],
                            "stemina2": d2[1][1]
                        }*/
                        this._matches[id] = {
                            gm,
                            canvas: txt,
                            0: {
                                strength: this._matchdata[this._matchquee[0]]["strength1"],
                                damage: 0,
                                stemina: this._matchdata[this._matchquee[0]]["stemina1"]
                            },
                            1: {
                                strength: this._matchdata[this._matchquee[0]]["strength2"],
                                damage: 0,
                                stemina: this._matchdata[this._matchquee[0]]["stemina2"]
                            },
                            finished: false
                        };
                        myResolve()
                        this._scene.registerBeforeRender(() => {
                            var ctx = this._matches[id].canvas.getContext();
                            ctx.font = '14px niko';
                            ctx.fillStyle = "red";
                            ctx.fillText("Damage:", 376, 50);
                            ctx.fillText("Damage:", 104, 50);
                            ctx.fillStyle = "white";
                            ctx.fillText(this._matches[id][0].damage, 189, 50);
                            ctx.fillText(this._matches[id][1].damage, 461, 50);
                            ctx.fillStyle = "yellow";
                            ctx.fillText("Strength:", 376, 70);
                            ctx.fillText("Strength:", 104, 70);
                            ctx.fillStyle = "white";
                            ctx.fillText(this._matches[id][0].strength, 209, 70);
                            ctx.fillText(this._matches[id][1].strength, 481, 70);
                            ctx.fillStyle = "green";
                            ctx.fillText("Stemina:", 376, 90);
                            ctx.fillText("Stemina:", 104, 90);
                            ctx.fillStyle = "white";
                            ctx.fillText(this._matches[id][0].stemina, 199, 90);
                            ctx.fillText(this._matches[id][1].stemina, 471, 90);
                            ctx.drawImage(img0, 0, 20, 96, 96);
                            ctx.drawImage(img1, 510, 20, 96, 96);
                            this._matches[id].canvas.update()
                        })
                    }, 1500)
                    /*  setTimeout(()=>{
                          gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[0])("fall")

                          gm.fighters.Fighter.prototype.setMove.bind(gm.game.fighters[1])("win")
                      },1500)*/

                    _keydown(74)
                    _keydown(89)
                    _keyup(89)
                    _keyup(74)
                    _keydown(37)
                    _keydown(38)
                    _keyup(38)
                    _keyup(37)
                }, 1000)
            });
        });
        return myPromise;
    }

    async test() {

        this.create_screen(0, new BABYLON.Vector3(0, -0.3, 16), Math.PI)
        //this.create_screen(1,new BABYLON.Vector3( 14.3,  -0.3 , -0.42 ),-4.71239)
        //this.create_screen(2,new BABYLON.Vector3( -6.44652 ,  -0.3 , 12.85 ),3.6651929249262)
        //this.create_screen(3,new BABYLON.Vector3( 6.44652 ,  -0.3 , 12.85 ),2.70526)

        let videoMat = new BABYLON.StandardMaterial("textVid", this._scene);
        videoMat.backFaceCulling = false;
        videoMat.specularColor = new BABYLON.Color3(255, 0, 0);
        videoMat.roughness = 1;

        let screen = this._scene.getMeshByName("canvas_screen")
        screen.checkCollisions = false;
        screen.material = videoMat

        var txt = new BABYLON.DynamicTexture(`canvas_11`, {
            width: 600,
            height: 400
        }, this._scene);
        videoMat.diffuseTexture = txt
        this.mainCanvas = txt

        idelcv.start(this.mainCanvas.getContext(), this.mainCanvas)




        /*let videoMat = new BABYLON.StandardMaterial("textVid", this._scene);
        videoMat.backFaceCulling = false;
        videoMat.specularColor = new BABYLON.Color3(255, 0, 0);
        videoMat.roughness = 1;*/



        /*  const optionalHlsOpts = null;
          const optionalThetaOpts = {
            allowRangeRequests: true, // false if cdn does not support range headers  
          };
          const player = videojs('videojs-theta-plugin-player', {
                  techOrder: ["theta_hlsjs", "html5"],
                  sources:[{
                      src: "http://127.0.0.1:7935/stream/".concat("0x80d639396bf022e61dcbf4edfa6c0f367f558891", ".m3u8?ts=").concat( (new Date).getTime()),
                      type: "application/x-mpegURL",
                      label: "Auto"
                  }],
                  theta_hlsjs: {
                      videoId: "test",
                      userId: "user1", 
                      onThetaReady: null, // optional listener
                      onStreamReady:  ()=> {
                          setTimeout( ()=> {
                              player.autoplay("any")
                              let vp1 = $( "#videojs-theta-plugin-player" ).children("video")[0]
                              let vtx = new BABYLON.VideoTexture('vtx1', vp1, this._scene, true, true);
                              videoMat.diffuseTexture = vtx;
                              screen.material = videoMat;

                          }, 500)
                      },
                      hlsOpts: optionalHlsOpts,
                      thetaOpts: optionalThetaOpts,
                  }
              });*/




        /*const box = BABYLON.MeshBuilder.CreateBox("test_box", {
            height:1,
            width:1
        }, this._scene);
        box.position.y = -1.8
        box.position.x= this.randomPosition(-9.0,9.0)
        box.position.z = this.randomPosition(0.0,13.0)
        let ellipsoid =  this._scene.getMeshByName("__ellipsoid__")
        ellipsoid.actionManager = new BABYLON.ActionManager(this._scene);
        ellipsoid.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                {
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter:  box,
                },
                () => {
                    this._remoteChannel.join("test")
                    console.log("Collison found...")
                },
            ),
   
        );
        ellipsoid.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                {
                    trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
                    parameter: box,
                },
                () => {
                    this._remoteChannel.leave("test")
                    console.log("Collison Exited...")
                },
            ),
   
        );*/


    }



    async createCC() {
        var agMap = {};
        var allAGs = this._scene.animationGroups;
        for (let i = 0; i < allAGs.length; i++) {
            agMap[allAGs[i].name] = allAGs[i];
        }

        //allAGs[0].stop();


        this._cc = new CharacterController(this._player, this._camera, this._scene);
        this._cc.setFaceForward(true);
        this._cc.setMode(0);
        this._cc.setTurnSpeed(45);
        this._cc.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));
        this._cc.setNoFirstPerson(false);
        this._cc.setStepOffset(0.4);
        this._cc.setSlopeLimit(30, 60);

        //this._cc.setAnimationGroups(agMap)

        //this._cc.setIdleAnim(agMap["tpose"], 1, true);
        /*this._cc.setTurnLeftAnim(agMap["tpose"], 0.5, true);
        this._cc.setTurnRightAnim(agMap["tpose"], 0.5, true);
        this._cc.setWalkBackAnim(null, 0.5, true);
        this._cc.setIdleJumpAnim(null, 0.5, false);
        this._cc.setRunJumpAnim(null, 0.6, false);
        this._cc.setFallAnim(null, 2, false);
        this._cc.setSlideBackAnim(null, 1, false);*/

        /*this._cc.setIdleAnim("idle", 1, true);
        this._cc.setTurnLeftAnim("turnLeft", 0.5, true);
        this._cc.setTurnRightAnim("turnRight", 0.5, true);
        this._cc.setWalkBackAnim("walkBack", 0.5, true);
        this._cc.setIdleJumpAnim("idleJump", 0.5, false);
        this._cc.setRunJumpAnim("runJump", 0.6, false);
        this._cc.setFallAnim("fall", 2, false);
        this._cc.setSlideBackAnim("slideBack", 1, false);*/

        //this._cc.enableBlending(0.05);
        this._cc.start();
    }

    async get_nft(id) {
        const query = gql `{nfts(where: {id:${id} }) {
            uri
            power
          }}
        `
        let nfts = await request('https://cello-graphnode.overclockedbrains.co/subgraphs/name/MetaBulls', query)
        try {
            return [nfts['nfts'][0]['uri'],
                [Number(nfts['nfts'][0]['power'][0]), Number(nfts['nfts'][0]['power'][1])], id
            ]

        } catch (e) {
            return ["/temp/0.svg", [100, 200, 50].slice(0, 2)]
        }

        //
    }
    async get_my_details() {
        try {
            let adrs = await web3.eth.getAccounts()
            const query = gql `{
            users(where: {id: ${JSON.stringify(adrs[0].toLowerCase())}}){
                    nftlist {
                        id
                        uri
                    }
                    dmg
                }
            }
        `
            this.mynfts = []
            let data = await request('https://cello-graphnode.overclockedbrains.co/subgraphs/name/MetaBulls', query)
            console.log(JSON.stringify(data))
            if (data['users'].length > 0) {
                let dmg = data['users'][0]['dmg']
                if (dmg) {
                    $("#dmgkt").text((Number(dmg) / (10 ** 18)).toFixed(0))
                }
                for (let n of data['users'][0]['nftlist']) {

                    let y = await this.get_nft(n['id'])
                    //console.log(y)
                    this.mynfts.push(y)
                }
                this.uIkit()
            }
        } catch (e) {
            console.log("I am in error")
        }
    }

    relist_match() {
        let s = ''
        for (let b of this._matchquee) {
            /*
                  {
                      "p1":m.token0,
                      "p2":m.token1,
                      "img1":d1[0],
                      "img2": d2[0],
                       "strength1":d1[1][0],
                       "strength2":d2[1][0],
                       "stemina1":d1[1][1],
                       "stemina2":d2[1][1]
                  }
                  */
            let mdata = this._matchdata[b]
            let c = `<div style="display: flex;flex-direction: column;">
                <div style="display: flex; justify-content: space-evenly;">
                <img draggable='false' src="https://${mdata['uimg1']}.ipfs.infura-ipfs.io/"  height="48" width="48">
                <span class="stext" style="align-self: center;color: red">vs</span>
                <img draggable='false' src="https://${mdata['uimg2']}.ipfs.infura-ipfs.io/"  height="48" width="48">
                </div>
                <div style="display: flex; justify-content: space-around;">
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px;"  class="strength">Strength: <span style="font-size: 12px;color: black"  class="stext">${mdata['strength1']}</span></span>
                    <span  style="font-size: 12px;" class="stemina">Stemina: <span  style="font-size: 12px;color: black"  class="stext">${mdata['stemina1']}</span></span>
                </div>
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px;" class="strength">Strength: <span  style="font-size: 12px;color: black" class="stext">${mdata['strength2']}</span></span>
                    <span   style="font-size: 12px;" class="stemina">Stemina: <span  style="font-size: 12px;color: black" class="stext">${mdata['stemina2']}</span></span>
                </div>
                </div>
                <div style="display: flex;justify-content: space-around;margin-top: 12px;">
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px; color:#00cbeb" class="strength">Block: <span  style="font-size: 12px;color: black" class="stext">${b}</span></span>
                    <!--<span style="font-size: 12px; color:#ff179a" class="strength">NFT-winner: <span  style="font-size: 12px;color: black" class="stext">0</span></span>-->
                </div>
                <div>
                    <button style="font-size: 12px;padding: 5px;padding-left: 10px; padding-right: 10px;border-radius: 30px; align-self: center;" value="${b}"  onclick="clickme('${btoa(JSON.stringify(mdata))}')" id="bidit_${b}">Bid</button>
                </div>
                </div>
                <div style="background-color: rgba(0,0,0,0.6);height: 1px;width: 100%; margin-top:10px">
            
                </div>
            </div>`
            s += c
        }
        $("#list").empty();
        $("#list").append(s)
        if ($("#list").is(":visible")) {
            $("#list").hide()
            $("#list").show()
        }

    }

    relist_winner() {
        let s = ''
        for (let b of this._winnerquee) {
            /*
                  {
                      "p1":m.token0,
                      "p2":m.token1,
                      "img1":d1[0],
                      "img2": d2[0],
                       "strength1":d1[1][0],
                       "strength2":d2[1][0],
                       "stemina1":d1[1][1],
                       "stemina2":d2[1][1]
                  }
                  */
            let mdata = this._winnerdata[b]
            let c = `<div style="display: flex;flex-direction: column;">
                <div style="display: flex; justify-content: space-evenly;">
                <img draggable='false' src="https://${mdata['uimg1']}.ipfs.infura-ipfs.io/"  height="48" width="48">
                <span class="stext" style="align-self: center;color: red">vs</span>
                <img draggable='false' src="https://${mdata['uimg2']}.ipfs.infura-ipfs.io/"  height="48" width="48">
                </div>
                <div style="display: flex; justify-content: space-around;">
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px;"  class="strength">Strength: <span style="font-size: 12px;color: black"  class="stext">${mdata['strength1']}</span></span>
                    <span  style="font-size: 12px;" class="stemina">Stemina: <span  style="font-size: 12px;color: black"  class="stext">${mdata['strength2']}</span></span>
                </div>
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px;" class="strength">Strength: <span  style="font-size: 12px;color: black" class="stext">${mdata['stemina1']}</span></span>
                    <span   style="font-size: 12px;" class="stemina">Stemina: <span  style="font-size: 12px;color: black" class="stext">${mdata['stemina2']}</span></span>
                </div>
                </div>
                <div style="display: flex;justify-content: space-around;margin-top: 12px;">
                <div style="display: flex;flex-direction: column;">
                    <span style="font-size: 12px; color:#00cbeb" class="strength">Block: <span  style="font-size: 12px;color: black" class="stext">${b}</span></span>
                    <span style="font-size: 12px; color:#ff179a" class="strength">NFT-winner: <span  style="font-size: 12px;color: black" class="stext">${mdata['winner']}</span></span>
                </div>
                <div>
                    <button style="font-size: 12px;padding: 5px;padding-left: 10px; padding-right: 10px;border-radius: 30px; align-self: center;" value="${b}"  onclick="clickmec('${btoa(JSON.stringify(mdata))}')"  id="bidit_${b}">Claim NFT</button>
                    <button style="font-size: 12px;padding: 5px;padding-left: 10px; padding-right: 10px;border-radius: 30px; align-self: center;" value="${b}"  onclick="clickmecx('${btoa(JSON.stringify(mdata))}')"  id="bidit_${b}">Claim Bid</button>
                </div>
                </div>
                <div style="background-color: rgba(0,0,0,0.6);height: 1px;width: 100%; margin-top:10px">
            
                </div>
            </div>`
            s += c
        }
        $("#list1").empty();
        $("#list1").append(s)
        if ($("#list1").is(":visible")) {
            $("#list1").hide()
            $("#list1").show()
        }

    }

    async loadimage(img) {
        img.crossOrigin = "anonymous";
        new Promise((myResolve, myReject) => {
            img.onload = () => {
                myResolve();
            }
        });
    }


    async loadPlayer() {
        /*let character  = await BABYLON.SceneLoader.ImportMeshAsync("", "", "Vincent-backFacing.babylon", this._scene);
      
        for(let m of character.meshes){
            console.log(m.name)
        }
        let skl = character.skeletons[0];*/

        /*this._player = BABYLON.MeshBuilder.CreateSphere("player_mesh", {
            diameter: 1
        });*/

        let character = await BABYLON.SceneLoader.ImportMeshAsync(null, "", "player.glb", this._scene);
        this._player = character.meshes[0]
        for (let m of character.meshes) {
            console.log(m.name)
            if (m.material) {
                console.log(m.material.name)
            }
        }

        this._player.rotation = this._player.rotationQuaternion.toEulerAngles();
        this._player.rotationQuaternion = null;
        //this._player.skeleton=skl;
        //skl.enableBlending(0.1);

        //this._player.rotate(new BABYLON.Vector3(0,1,0),Math.PI,0);


        //this._player.position.y=2.1;



        this._player.position.x = this.randomPosition(-9.0, 9.0)
        this._player.position.z = this.randomPosition(0.0, 13.0)

        // this._player.setPivotPoint(new BABYLON.Vector3(0, 2, 0));
        let buf_list = [this.compressFloatPos(this._player.position.x), this.compressFloatPos(this._player.position.z)]
        this._ws.send(Buffer.concat(buf_list))

        this.drawEllipsoid(this._player, "__ellipsoid__", 1, 8, 8, true)
        //this._player.setPivotPoint(new BABYLON.Vector3(0, 2, 0));
        // const mat = new BABYLON.StandardMaterial("playermat");
        // mat.diffuseTexture = new BABYLON.Texture("https://d5nunyagcicgy.cloudfront.net/external_assets/hero_examples/hair_beach_v391182663/original.jpeg");
        // this._player.material = mat
        this._player.checkCollisions = true;
        this._player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        this._player.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0);

        window.clickme = async (data) => {
            data = JSON.parse(atob(data))
            var plr = window.prompt("Select Player (0 or 1):");
            var amnt = window.prompt("Enter Bid Amount: ");
            let ad = await window.web3.eth.getAccounts();
            let contract = await new window.web3.eth.Contract(abi, "0xeDa409417bFBcd74A9fA52b1f7c038a45F629669");
            await contract.methods.PlaceBet(data['id'], Number(plr) ? true : false).send({
                from: ad[0],
                value: Web3.utils.toWei(amnt, 'ether')
            });
        }
        window.clickmecx = async (data) => {
            data = JSON.parse(atob(data))
            let ad = await window.web3.eth.getAccounts();
            let contract = await new window.web3.eth.Contract(abi, "0xeDa409417bFBcd74A9fA52b1f7c038a45F629669");
            await contract.methods.winclaim(data['id']).send({
                from: ad[0]
            });
        }


        window.clickmec = async (data) => {
            data = JSON.parse(atob(data))
            let ad = await window.web3.eth.getAccounts();
            let contract = await new window.web3.eth.Contract(abi, "0xeDa409417bFBcd74A9fA52b1f7c038a45F629669");
            if (data['addr1'].toLowerCase() == ad[0].toLowerCase()) {
                await contract.methods.claimnft(data['p1'], data['id']).send({
                    from: ad[0]
                });
            }else if(data['addr2'].toLowerCase() == ad[0].toLowerCase()){
                await contract.methods.claimnft(data['p2'], data['id']).send({
                    from: ad[0]
                });
            }

            this.get_my_details()

        }

        await this.get_my_details()
        this.setHandlerV()
        const GRAPHQL_ENDPOINT = "wss://cello-graphnode.overclockedbrains.co:9000/subgraphs/name/MetaBulls";



        const query = `subscription   {
            games{
              id
              startblock
              token0
              token1
              particiapte0 {
                id
              }
              participate1 {
                id
              }
            }
          }
          `;

        // set up the client, which can be reused
        const client = new SubscriptionClient(GRAPHQL_ENDPOINT, {
            reconnect: true,
            lazy: true, // only connect when there is a query
            connectionCallback: (error) => {
                error && console.error(error);
            },
        });

        // make the actual request
        client.request({
            query
        });

        // the above doesn't do much though
        let self = this
        // call subscription.unsubscribe() later to clean up
        const subscription = client
            .request({
                query
            })
            // so lets actually do something with the response
            .subscribe({
                async next({
                    data
                }) {
                    if (data) {
                        let cb = await web3.eth.getBlockNumber()
                        console.log("We got something!", data);
                        for (let m of data["games"]) {
                            if (m.startblock <= cb) {
                                continue;
                            }
                            let d1 = await self.get_nft(m.token0)
                            let d2 = await self.get_nft(m.token1)
                            var img1 = new Image();
                            img1.src = `https://${d1[0]}.ipfs.infura-ipfs.io/`;
                            await self.loadimage(img1)


                            var img2 = new Image();
                            img2.src = `https://${d2[0]}.ipfs.infura-ipfs.io/`;
                            await self.loadimage(img2)

                            self._matchquee.push(Number(m.startblock))
                            self._matchdata[Number(m.startblock)] = {
                                "p1": m.token0,
                                "p2": m.token1,
                                "img1": img1,
                                "img2": img2,
                                "uimg1": d1[0],
                                "uimg2": d2[0],
                                "strength1": d1[1][0],
                                "strength2": d2[1][0],
                                "stemina1": d1[1][1],
                                "stemina2": d2[1][1],
                                "id": m.id,
                                "addr1": m['particiapte0']['id'],
                                "addr2": m['participate1']['id']
                            }
                            self._matchquee.sort(function (a, b) {
                                return a - b;
                            });
                            self._matchquee = self._matchquee.filter((item, pos) => {
                                return self._matchquee.indexOf(item) == pos;
                            })
                        }
                        self.relist_match()
                    }
                },
            });




    }

    randomPosition(x, y): Number {
        return Number((Math.random() * (x - y) + y).toFixed(4))
    }

    drawEllipsoid(mesh, name, x, y, z, hide = false) {
        mesh.computeWorldMatrix(true);
        if (hide) {
            var ellipsoidMat = mesh.getScene().getMaterialByName("__ellipsoidMat__h");
            if (!ellipsoidMat) {
                ellipsoidMat = new BABYLON.StandardMaterial("__ellipsoidMat__h", mesh.getScene());
                ellipsoidMat.alpha = 0;
            }
        } else {
            var ellipsoidMat = mesh.getScene().getMaterialByName("__ellipsoidMat__");
            if (!ellipsoidMat) {
                ellipsoidMat = new BABYLON.StandardMaterial("__ellipsoidMat__", mesh.getScene());
                ellipsoidMat.wireframe = true;
                ellipsoidMat.emissiveColor = BABYLON.Color3.Green();
                ellipsoidMat.specularColor = BABYLON.Color3.Black();
            }
        }

        var ellipsoid = BABYLON.Mesh.CreateSphere(name, 9, 1, mesh.getScene());
        ellipsoid.scaling = mesh.ellipsoid.clone();
        ellipsoid.scaling.y *= x;
        ellipsoid.scaling.x *= y;
        ellipsoid.scaling.z *= z;
        ellipsoid.material = ellipsoidMat;
        ellipsoid.parent = mesh;
        ellipsoid.computeWorldMatrix(true);
        return ellipsoid;
    }

    async createRemotePlayer(id) {
        let rp = this._player.clone(`rp_${id}`)

        rp.checkCollisions = false;
        this._player.checkCollisions = false;
        rp.position.y = -1.6;

        rp.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        rp.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0);

        this._playerList[id] = new RemoteCharacterController(rp, this._scene, id, this._roomId);
        if (this._rcolor.hasOwnProperty(id)) {
            this._playerList[id].setColor(this._rcolor[id])
        }
        this._playerList[id].start()

    }


    async loadMeshes() {
        let Icosphere = await BABYLON.SceneLoader.ImportMeshAsync(null, "", "dome.glb", this._scene);
        for (let m of Icosphere.meshes) {
            if (m.name == "screen") {
                m.dispose()
                continue;
            }
            m.checkCollisions = true;
        }

        let Icosphere = await BABYLON.SceneLoader.ImportMeshAsync(null, "", "screen.glb", this._scene);
        for (let m of Icosphere.meshes) {
            console.log(m.name)

        }

        let Icosphere = await BABYLON.SceneLoader.ImportMeshAsync(null, "", "CELO.glb", this._scene);
        for (let m of Icosphere.meshes) {
            m.checkCollisions = false
            if (m.name == "Text.001") {
                let mat: PBRMaterial = m.material
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1)
                var gl = new BABYLON.GlowLayer("glowx", this._scene);
                gl.addIncludedOnlyMesh(m)
                gl.intensity = 1

            }

        }

        let okex = Icosphere.meshes[0]
        okex.scaling = new BABYLON.Vector3(3, 3, 3)
        okex.position.z = 5

        let anim1 = Icosphere.animationGroups[1] 
        anim1.start(true, 1.0, anim1.from, anim1.to, false);

        let Icosphere = await BABYLON.SceneLoader.ImportMeshAsync(null, "", "digital_board.glb", this._scene);
        for (let m of Icosphere.meshes) {
            console.log(m.name)
            if (m.material && m.material.name == "projection") {

            }

        }

        var groundWidth = 2;
        var groundHeight = 0.5;

        var ground = BABYLON.MeshBuilder.CreateGround("ground1", {
            width: groundWidth,
            height: groundHeight,
            subdivisions: 25
        }, this._scene);
        var txt = new BABYLON.DynamicTexture(`canvas_brd`, {
            width: 512,
            height: 256
        }, this._scene);
        let bmat: StandardMaterial = new BABYLON.StandardMaterial('ww', this._scene)

        bmat.diffuseTexture = txt
        ground.material = bmat
        this.brdcanvas = txt


        let b: BABYLON.Mesh = Icosphere.meshes[0]
        console.log(b.getBoundingInfo())
        b.position = new BABYLON.Vector3(0, 2, 16.5)
        ground.position = new BABYLON.Vector3(0, 2, 16.45)
        ground.rotate(new BABYLON.Vector3(1, 0, 0), Math.PI / 2, 0);
        ground.rotate(new BABYLON.Vector3(0, 1, 0), -Math.PI, 0);
        ground.rotate(new BABYLON.Vector3(0, 0, 1), -Math.PI, 0);

        /*let screen = this._scene.getMeshByName("screen")
        screen.position.x=10
        let screen1 = this._scene.getMeshByName("screen.001")
        let screen2 = this._scene.getMeshByName("screen.002")
        let screen3 = this._scene.getMeshByName("screen.003")
        let screen4 = this._scene.getMeshByName("screen.004")
        screen.material = videoMat; 
        screen1.material = videoMat; 
        screen2.material = videoMat; 
        screen3.material = videoMat; 
        screen4.material = videoMat; 

        screen.checkCollisions=false;
        screen1.checkCollisions=false;
        screen2.checkCollisions=false;
        screen3.checkCollisions=false;
        screen4.checkCollisions=false;*/

        let pbr_stage0 = new BABYLON.PBRMaterial("pbr", this._scene);
        let pbr_stage1 = new BABYLON.PBRMaterial("pbr", this._scene);




        let stage_mesh_0 = this._scene.getMeshByName("stage_primitive0")
        let stage_mesh_1 = this._scene.getMeshByName("stage_primitive1")
        let cylinder0 = this._scene.getMeshByName("Cylinder_primitive0")

        stage_mesh_0.material = pbr_stage0;
        stage_mesh_1.material = pbr_stage1;

        pbr_stage0.metallic = 1.0;
        pbr_stage0.roughness = 0.2;
        pbr_stage1.metallic = 1.0;
        pbr_stage1.roughness = 0.1;
        pbr_stage0.subSurface.isRefractionEnabled = true;
        pbr_stage1.subSurface.isRefractionEnabled = true;

        var glass = new BABYLON.PBRMaterial("glass", this._scene);

        glass.indexOfRefraction = 0.52;
        glass.alpha = 0.1;
        glass.directIntensity = 0.0;
        glass.environmentIntensity = 0.7;
        glass.cameraExposure = 0.66;
        glass.cameraContrast = 1.66;
        glass.microSurface = 1;
        glass.subSurface.isRefractionEnabled = true;
        glass.reflectivityColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        glass.albedoColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        cylinder0.material = glass;

        var gl = new BABYLON.GlowLayer("glow", this._scene);

        gl.addIncludedOnlyMesh(this._scene.getMeshByName("Cylinder.003"))
        gl.addIncludedOnlyMesh(this._scene.getMeshByName("Cylinder.007"))
        gl.addIncludedOnlyMesh(this._scene.getMeshByName("Cylinder.008"))
        gl.addIncludedOnlyMesh(this._scene.getMeshByName("Cylinder.009"))
        gl.addIncludedOnlyMesh(this._scene.getMeshByName("Cylinder.010"))
        gl.intensity = 0.1;



        //let cc = new CharacterController(c, this._camera, this._scene);
        //console.log(cc)
    }




    doRender(): void {
        // The canvas/window resize event handler.
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
}