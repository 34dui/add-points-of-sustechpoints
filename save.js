


import { Editor } from "./editor.js";
import { checkScene } from "./error_check.js";
import {logger} from "./log.js"




function reloadWorldList(worldList, done){
    var xhr = new XMLHttpRequest();
        // we defined the xhr
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            let anns = JSON.parse(this.responseText);
        
            // load annotations
            anns.forEach(a=>{
                let world = worldList.find(w=>{
                    return (w.frameInfo.scene == a.scene && 
                            w.frameInfo.frame == a.frame);
                    });
                if (world){
                    world.annotation.reapplyAnnotation(a.annotation);
                }
                else{
                    console.error("bug?");
                }
                
            });

            if (done)
                done();
        }
    };
    
    xhr.open('POST', "/loadworldlist", true);

    let para = worldList.map(w=>{
        return {
            //todo: we could add an id, so as to associate world easily
            scene: w.frameInfo.scene, 
            frame: w.frameInfo.frame,
        };
    });

    xhr.send(JSON.stringify(para));
}


var saveDelayTimer = null;
var pendingSaveList = [];

function saveWorldList(worldList){

    //pendingSaveList = pendingSaveList.concat(worldList);

    worldList.forEach(w=>{
        if (!pendingSaveList.includes(w))
            pendingSaveList.push(w);
    });

    if (saveDelayTimer)
    {
        clearTimeout(saveDelayTimer);
    }
    
    saveDelayTimer = setTimeout(()=>{
            
        logger.log("save delay expired.");

        //pandingSaveList will be cleared soon.
        let scene = pendingSaveList[0].frameInfo.scene;
        

        doSaveWorldList(pendingSaveList, ()=>{
            editor.header.updateModifiedStatus();

            checkScene(scene);
        });

        //reset

        saveDelayTimer = null;
        pendingSaveList = [];

        
    }, 

    500);
}


function doSaveWorldList(worldList, done)
{
    if (worldList.length>0){
        if (worldList[0].data.cfg.disableLabels){
            console.log("labels not loaded, save action is prohibitted.")
            return;
        }
    }


    console.log(worldList.length, "frames");
  // === 修改代码开始 ===
    let ann = worldList.map(w=>{
        return {
            scene: w.frameInfo.scene,
            frame: w.frameInfo.frame,
            annotation: w.annotation.boxes.map(box => {
                // 获取box的标注数据
                let ann = w.annotation.boxToAnn(box);
                
                // 计算点云数量并添加到标注中
                if (w.lidar) {
                    ann.point = w.lidar.get_box_points_number(box);
                    // 同时更新box对象的point属性，以便后续使用
                    box.point = ann.point;
                } else {
                    ann.point = 0;
                    box.point = 0;
                }
                
                // 添加其他字段
                if (box.annotator)
                    ann.annotator = box.annotator;

                if (box.follows)
                    ann.follows = box.follows;
                    
                return ann;
            }),
        };
    })
    // === 修改代码结束 ===
   

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveworldlist", true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            
            worldList.forEach(w=>{
                w.annotation.resetModified();
            })

            logger.log(`saved: ${worldList[0].frameInfo.scene}: ${worldList.reduce((a,b)=>a+" "+b.frameInfo.frame, "")}`);

            if(done){
                done();
            }
        }
        else{
            window.editor.infoBox.show("Error", `save failed, status : ${this.status}`);
        }
        
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(ann);
    //console.log(b);
    xhr.send(b);
}

// function saveWorld(world, done){
//     if (world.data.cfg.disableLabels){
//         logger.log("labels not loaded, save action is prohibitted.")
//         return;
//     }

//     console.log(world.annotation.boxes.length, "boxes");
//     let bbox_annotations = world.annotation.toBoxAnnotations();

//     var xhr = new XMLHttpRequest();
//     xhr.open("POST", "/saveworld" +"?scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);
//     xhr.setRequestHeader('Content-Type', 'application/json');

//     xhr.onreadystatechange = function () {
//         if (this.readyState != 4) return;
    
//         if (this.status == 200) {
//             logger.log(`saved: ${world}`);
//             world.annotation.resetModified();

//             //reload obj-ids of the scene
//             //todo: this shall be moved to done
//             //load_obj_ids_of_scene(world.frameInfo.scene);

//             if(done){
//                 done();
//             }

            
            
//         }
    
//         // end of state change: it can be after some time (async)
//     };

//     var b = JSON.stringify(bbox_annotations);
//     //console.log(b);
//     xhr.send(b);
// }


export {saveWorldList, reloadWorldList}