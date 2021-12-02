// @ts-nocheck

import MyScene from './my-scene'
window.toast = (message)=>{
    Toastify({
        text: message,
        backgroundColor: "linear-gradient(to right, #ff416c, #ff4b2b)",
        className: "info",
        duration:1500
      }).showToast();
}
document.addEventListener('DOMContentLoaded', function () {
    const ele = document.getElementById('avnfts');
    ele.style.cursor = 'grab';

    let pos = { top: 0, left: 0, x: 0, y: 0 };

    const mouseDownHandler = function (e) {
        ele.style.cursor = 'grabbing';
        ele.style.userSelect = 'none';

        pos = {
            left: ele.scrollLeft,
            top: ele.scrollTop,
            // Get the current mouse position
            x: e.clientX,
            y: e.clientY,
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
        // How far the mouse has been moved
        const dx = e.clientX - pos.x;
        const dy = e.clientY - pos.y;

        // Scroll the element
        ele.scrollTop = pos.top - dy;
        ele.scrollLeft = pos.left - dx;
    };

    const mouseUpHandler = function () {
        ele.style.cursor = 'grab';
        ele.style.removeProperty('user-select');

        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    // Attach the handler
    ele.addEventListener('mousedown', mouseDownHandler);
});
window.addEventListener('DOMContentLoaded',async () => {

    async function check_metamask(){
        try{
            if (window.ethereum) {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                window.web3 = await new Web3(window.ethereum);
                return true;
            }  
            return false;
        }catch(e){
            console.log(e)
            throw("")
    
        }
    }

    $("#wfh").click(async ()=> {
        $("#wfh").hide()
        $("#list1").hide()
        $("#loader").show()
        $("#loadertx").show()
        $("#loadertx").text("Checking Metamsk...")
        let isMetmask = await check_metamask()
        if(!isMetmask){
            $("#loader").hide()
            $("#loadertx").hide()
            $("#wfh").show()
            toast("Please Install Metamask!")
            return
        }
        let cid =await web3.eth.net.getId()
        if(cid!=80001){
            $("#loader").hide()
            $("#loadertx").hide()
            $("#wfh").show()
            toast("Please Switch To Mumbai Tesnet!")
            return
        }
        let game = new MyScene('renderCanvas');
        game.wsClient((isJoin, message)=>{
            if(!isJoin){
                $("#loadertx").text(message)
                console.log(message)
                return
            }
            $( "#home" ).hide();
            stop_anim()
            $( "#game" ).show();
          
            game.startRenderLoop()
            game.doRender()
        })
    


    })

   
    $('#menu_page').css('height', window.innerHeight/1.5);
    $('#menu_page').css('width', window.innerHeight/3);
    let v=false;
    
    $("#menu").click(()=> {
        if(v){
            $( "#menu_page" ).fadeOut();
            v=false;
        }else{
            $( "#menu_page" ).fadeIn();
            v=true;
        } 
    })


  
});