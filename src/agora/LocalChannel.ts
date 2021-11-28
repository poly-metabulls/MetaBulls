// @ts-nocheck

export default class LocalChannel {
    client=null;
    agoraToken="c868a38007fb4e2e87c7d65ea3177117"
    localAudioTrack=null
    is_mute=true
    constructor(){
        this.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    }

    async create_channel(channel_name){
        await this.client.join(this.agoraToken,channel_name,null,null);
        await this.client.setClientRole('host');
    }

    async mute(){
        try{
            if(!this.is_mute){
                await this.client.unpublish()
                this.is_mute=true;
            }
        }catch(e){
            console.log("LocalChannel-mute:"+e)
        }
    }

    async unmute(){
        try{
            if(this.is_mute){
                if(!this.localAudioTrack){
                    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(); 
                }
                if(this.localAudioTrack){
                    this.client.publish([this.localAudioTrack]);
                    this.is_mute=false;
                }
            }
        }catch(e){
            console.log("LocalChannel-unmute:"+e)
        }
    }
}