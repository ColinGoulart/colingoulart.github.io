


var canvas=document.getElementById("canvas");
var ctx=canvas.getContext("2d");

var image = new Image();
image.crossOrigin = 'anonymous';
image.src = "./Images/Spritesheet.jpg";

var spritesheetdata;
var sprite;

image.onload=()=>{
    ctx.drawImage(image, 0, 0);
    spritesheetdata = ctx.getImageData(0,0,256,256).data;
    console.log(spritesheetdata);
    sprite = getSprite(0,0,spritesheetdata);
    console.log(sprite);
}

function getSprite(x_index, y_index, spritesheetdata){

    var sprite_sheet_width = 256;
    
    var cell_size = 16;
    var texture = [];

    for(var y=0; y<cell_size<<2; y+=4){
      for(var x=0; x<cell_size<<2; x+=4){

        var index = (x+y*sprite_sheet_width);

        texture.push(spritesheetdata[index]);
        texture.push(spritesheetdata[index+1]);
        texture.push(spritesheetdata[index+2]);
        texture.push(spritesheetdata[index+3]);


      }
    }

    return texture;
}


canvas.width = screen.width*.7;
canvas.height = screen.height*.7;

var width = canvas.width;
var height = canvas.height;


var WireFrameView = false;

//performance
var frames = 0;
var ticks = 0;
var delta = 0;
var fps = 1000/60;
var lastTime = Date.now();
var lastFPSReq = Date.now();
var updated_ticks = 0;
var updated_frames = 0;

//math
var cos = Math.cos;
var sin = Math.sin;
var abs = Math.abs;
var pi = Math.PI;

var max = Math.max;
var min = Math.min;

var tan = Math.tan;
var floor = Math.floor;
var pow = Math.pow;

//storage
var keys = new Array(120);
var entities = [];

//cmd prompt
var cmd_prmpt_enabled = false;
var cmd_prmpt = "";


//inputs
var delta_x = 0;
var delta_y = 0;
var mouse_sensitivity = .1;
var mouse_down = false;
var focused = false;
var running = true;
var affine_enabled = false;

var m_x = 0;
var m_y = 0;

var last_x = 0;
var last_y = 0;

var a = 0;
var cam_spd = 15;
var client_x = 0;
var client_y = 0;
var y_rot_bound = 80;
var tris_queue = [];

var physics_enabled = false;

//camera_settings
var fov = 90;
var aspect_ratio = canvas.height/canvas.width;
var znear = 0;
var zfar = 10;

var bg_col = 0;

ctx.fillStyle="black";
ctx.fillRect(0,0,canvas.width,canvas.height);

ctx.fillStyle="white";
ctx.font = "20px Arial";
var error_text = `VOID`;
ctx.fillText(error_text, canvas.width/2-(error_text.length*(15/5)), canvas.height/2);

var depth_buffer = new Array(width*height);

var imgData = ctx.getImageData(0,0,width,height);
var map_data = imgData.data;

function lerp(a,b,t){ 
  return a+(b-a)*t; 
}
function rgb_r(col){return (col>>16)&0xFF}
function rgb_g(col){return (col>>8)&0xFF}
function rgb_b(col){return (col)&0xFF}

function hex_r(col){return (col<<16)}
function hex_g(col){return (col<<8)}

var cam = new mat4(new vec3(0,0,0));

cam.right_vec = new vec3(1,0,0);
cam.up_vec = new vec3(0,1,0); 
cam.foward_vec = new vec3(0,0,1);

function array_to_vec3(arr){
  return new vec3(arr[0],arr[1],arr[2]);
}
function vec3_to_array(vec3){
  return [vec3.x,vec3.y,vec3.z];
}

//ccw scheme

var plr_pos = new vec3(0,0,0);
var gravity = new vec3(0,9,0);
var velocity = new vec3(0,0,0);


function rad(deg){return deg*pi/180}
function deg(rad){return rad*180/pi}


function insertEntity(type,mat4,tris){
    var entity = new Cube(mat4);

    switch(type){
      case "Cube":
        entity = new Cube(mat4);
      break;
      case "Pyramid":
        entity = new Pyramid(mat4); 
      break;
      case "Custom": 
        entity = new Custom(mat4);
        entity.tris = tris;
      break;
    }

    entities.push(entity);
    return entity;
}


function randomRange(range){
    return -range+Math.random()*(range*2);
}

var tri_primitive =  [
          [
                [-.5,-.5,0],
                [.5,-.5,0],
                [0,.5,0],
          ],
        ];

for(var i=0; i<10; i++){
    //var cube = insertEntity("Cube", new mat4(new vec3(0,1.5,2.5+i*1.1)));
   // cube.color = Math.floor(Math.random() * 0xFFFFFF);
}

var player_cube = insertEntity("Cube",new mat4(new vec3(0,1.5,2.6)));
player_cube.color = 0xFF00FF;

///////////// 3D RENDERING ///////////////

function apply_pers_proj(vertex){

  if(!vertex) return;    
 
  var x = vertex[0];
  var y = vertex[1];
  var z = vertex[2];
  
  var f = 1/tan(rad(fov)/2);

  var h = zfar/(zfar-znear);
  var w = abs(z*h-h*znear);

  w = (w==0?1:w);

  return [
          (aspect_ratio*f*x)/w,
          (f*y)/w,
          z/w,
          1/w
        ];
}

function apply_cam(vertex){ 

  var x = vertex[0];
  var y = vertex[1];
  var z = vertex[2];
  
  var v = new vec3(x,y,z);
  
  var i = cam.right_vec;
  var j = cam.up_vec;
  var k = cam.foward_vec;
  
  var cam_rel = v.sub(cam.pos);
  
  var d1 = i.dot(cam_rel);
  var d2 = j.dot(cam_rel);
  var d3 = k.dot(cam_rel);

  return [d1,d2,d3];
}

function transform(tri,mat4){
  var x = tri[0]*mat4.m00+tri[1]*mat4.m01+tri[2]*mat4.m02+mat4.pos.x;
  var y = tri[0]*mat4.m10+tri[1]*mat4.m11+tri[2]*mat4.m12+mat4.pos.y;
  var z = tri[0]*mat4.m20+tri[1]*mat4.m21+tri[2]*mat4.m22+mat4.pos.z;
  return [x,y,z];
}


function getPointInBounds(px,py,s){

    var nx=px;
    var ny=py;
    var w = width;
    var h = height;

    var min_x = (-py)/s+px;
    var max_x = (h-py)/s+px;

    var min_y = -px*s+py;
    var max_y = s*(w-px)+py;

    if(py<0){
      ny=0;
      if(min_x>w){
        nx=w;
        ny=max_y;
      }else if(min_x<0){
        nx=0;
        ny=min_y;
      }else{
        nx=min_x;
      }
    }else if(py>h){
      ny=h;
      nx=max_x;
    }

    if(nx<0){
      nx=0;
      ny=min_y;
    }else if(nx>w){
      nx=w;
      ny=max_y;
    }

    return {x: nx, y: ny};
}

var biggest_line = Math.sqrt(width*width+height*height);


function scale_transform_y(y){
    return -y*height+height/2;
}
function scale_transform_x(x){
    return x*width+width/2;
}

function squash_x(x){
    return (x-width/2)/width;
}

function squash_y(y){
    return -(y-height/2)/height;
}

function createVisualPoint(point,thickness,col){

    for(var i=0; i<thickness*thickness; i++){
    
        var x=i%thickness;
        var y=floor(i/thickness);
    
        setPixel(point.x-(floor(thickness/2))+x, point.y-(floor(thickness/2))+y, col);
    }
}

function getLowPointTri(p1,p2,p3){
    var lowest = .5;
    if(p1.y<lowest) lowest=p1.y;
    if(p2.y<lowest) lowest=p2.y;
    if(p3.y<lowest) lowest=p3.y;
    return lowest;
  }

function getHighPointTri(p1,p2,p3){
    var highest = -.5;
    if(p1.y>highest) highest=p1.y;
    if(p2.y>highest) highest=p2.y;
    if(p3.y>highest) highest=p3.y;
    return highest;
  }


function clamp(x,a,b){
    return Math.min(Math.max(x,a),b);
};

function setPixel(x,y,col,alpha){

    y=floor(y+.5);
    x=floor(x+.5);

    if(x<=0 || x>=width || y<=0 || y>=height) return;

    var pos = x*4+y*canvas.width*4;
    map_data[pos] = rgb_r(col);
    map_data[pos+1] = rgb_g(col);
    map_data[pos+2] = rgb_b(col);
    map_data[pos+3] = alpha;
}

var light_direction = new vec3(0,0,-.5);

function drawLine(v0,v1,v2,rasterize,n_x,n_y,n_z,col){
    
    var scale_x = canvas.width;
    var scale_y = canvas.height;

    var x1 = scale_transform_x(v0[0]);
    var y1 = scale_transform_y(v0[1]);

    var x2 = scale_transform_x(v1[0]);
    var y2 = scale_transform_y(v1[1]);

   // console.log("test");

    //line adjustment
    var dx = x2-x1;
    var dy = y2-y1;
    var s =  dy/dx;

    //gets points when line intersects screen boundaries
    var fixed_p1 = getPointInBounds(x1,y1,s); 
    var fixed_p2 = getPointInBounds(x2,y2,s);

    var nx = fixed_p2.x-fixed_p1.x;
    var ny = fixed_p2.y-fixed_p1.y;

    var mag = Math.sqrt(nx*nx+ny*ny); //in case all hell breaks loose I implemented a min mag.

    var unit_x = nx/mag;
    var unit_y = ny/mag;
    
    //console.log(mag);

    for(var i=0; i<mag; i+=.5){

        if(v0[2] < 0 && v1[2] < 0 && v2[2] < 0) break;

        var x = fixed_p1.x+(unit_x*i); 
        var y = fixed_p1.y+(unit_y*i);

        //console.log(rasterize);

        if(!rasterize){
          setPixel(x,y);
        }else{
          rasterPixel(x,y,v0,v1,v2,n_x,n_y,n_z,col);
        }
    }
}

function rasterPixel(x,y,v0,v1,v2,n_x,n_y,n_z,col){

    x = floor(x+.5);
    y = floor(y+.5);


    var c1_x = squash_x(x)-v0[0];
    var c1_y = squash_y(y)-v0[1];

    var startdistfromplane = c1_x*n_x
                            +c1_y*n_y
                            -v0[2]*n_z;


    var projectedlinelength = -100*n_z;
    var scale = startdistfromplane/projectedlinelength;

    var depth = startdistfromplane==0 ? 0 : 100*scale;

    if(depth <= depth_buffer[x+y*width]){

        setPixel(x,y,col,255*(1/depth));
        depth_buffer[x+y*width] = depth;
    }
}


function CROSS(A,B){
    return  [
            A[1]*B[2] - A[2]*B[1],
            A[2]*B[0] - A[0]*B[2],
            A[0]*B[1] - A[1]*B[0]
    ];

}

function SUB(A,B){
  return [A[0]-B[0], A[1]-B[1], A[2]-B[2]];
}

function MAG(VEC){
  return Math.sqrt(VEC[0]*VEC[0]+VEC[1]*VEC[1]+VEC[2]*VEC[2]);
}

function UNIT(VEC){
    var MAG = Math.sqrt(VEC[0]*VEC[0]+VEC[1]*VEC[1]+VEC[2]*VEC[2]);
    return [VEC[0]/MAG, VEC[1]/MAG, VEC[2]/MAG];
}

function DOT(A,B){
    return A[0]*B[0]
          +A[1]*B[1]
          +A[2]*B[2];
}

function LineIntersectsPlane(ls_x,ls_y,ls_z,le_x,le_y,le_z,n_x,n_y,n_z,o_x,o_y,o_z){

    var v1_x = ls_x - o_x;
    var v1_y = ls_y - o_y;
    var v1_z = ls_z - o_z;

    var startdistfromplane = v1_x*n_x
                            +v1_y*n_y
                            +v1_z*n_z;

    var projectedlinelength;

    if(startdistfromplane==0){
        return ls_z;
    }

    v1_x = ls_x - le_x;
    v1_y = ls_y - le_y;
    v1_z = ls_z - le_z;

    projectedlinelength =  v1_x*n_x
                          +v1_y*n_y
                          +v1_z*n_z;


    var scale = startdistfromplane/projectedlinelength;

    return ls_z - v1_z * scale;
}


function getTextureCoordinates(v0, v1, v2){


}

function rasterize(v0,v1,v2,n_x,n_y,n_z,tri_info,col,texture_coords){

    var tri_prim_v0 = tri_info[0][0];
    var tri_prim_v1 = tri_info[0][1];
    var tri_prim_v2 = tri_info[0][2];

    var v0_x = v0[0];
    var v0_y = v0[1];
    var v0_z = v0[2];
    var v0_w = v0[3];

    var v1_x = v1[0];
    var v1_y = v1[1];
    var v1_z = v1[2];
    var v1_w = v1[3];

    var v2_x = v2[0];
    var v2_y = v2[1];
    var v2_z = v2[2];
    var v2_w = v2[3];

    var min_x = floor(scale_transform_x(Math.min(v0_x, v1_x, v2_x))+.5);
    var max_x = floor(scale_transform_x(Math.max(v0_x, v1_x, v2_x))+.5);

    var max_y = floor(scale_transform_y(Math.min(v0_y, v1_y, v2_y))+.5);
    var min_y = floor(scale_transform_y(Math.max(v0_y, v1_y, v2_y))+.5);


    var texture_coords_00 = texture_coords[0][0];
    var texture_coords_10 = texture_coords[1][0];
    var texture_coords_20 = texture_coords[2][0];

    var texture_coords_01 = texture_coords[0][1];
    var texture_coords_11 = texture_coords[1][1];
    var texture_coords_21 = texture_coords[2][1];

    if(!affine_enabled){
    
      texture_coords_00 *= v0[3];
      texture_coords_10 *= v1[3];
      texture_coords_20 *= v2[3];

      texture_coords_01 *= v0[3];
      texture_coords_11 *= v1[3];
      texture_coords_21 *= v2[3];
    }
    
    var secondary_col = 0;

    var s_r = 0;
    var s_g = 0;
    var s_b = 0;

    for(var y=clamp(min_y, 0, width); y<clamp(max_y, 0, height); y++){
        for(var x=clamp(min_x, 0, width); x<clamp(max_x, 0, width); x++){

            var p_x = (x-width/2)/width; 
            var p_y = -(y-height/2)/height;

            var AREA =   (v1_y-v2_y)*(v0_x-v2_x)+(v2_x-v1_x)*(v0_y-v2_y);
            var alpha = ((v1_y-v2_y)*(p_x-v2_x)+(v2_x-v1_x)*(p_y-v2_y))/AREA; //How close pixel is to v0 
            var beta =  ((v2_y-v0_y)*(p_x-v2_x)+(v0_x-v2_x)*(p_y-v2_y))/AREA; //How close pixel is to v1
            var gamma = 1-alpha-beta; // How close pixel is to v2

            if(alpha >= 0 && beta >= 0 && gamma >= 0){ // winning pixels

                var index = x+y*width; 

                var u =  ((texture_coords_00)*alpha)
                        +((texture_coords_10)*beta)
                        +((texture_coords_20)*gamma);

                        
                var v = 
                        ((texture_coords_01)*alpha)+
                        ((texture_coords_11)*beta)+
                        ((texture_coords_21)*gamma);


                var w =  (alpha*(v0_w)
                          +beta*(v1_w)
                          +gamma*(v2_w));


                var sprite_index = floor((u/(affine_enabled ? 1 : w))*16)+floor((v/(affine_enabled ? 1 : w))*16)*16;

                var p_r = sprite[(sprite_index<<2)]; //(col>>16)&0xFF;
                var p_g = sprite[(sprite_index<<2)+1]; //(col>>8)&0xFF;
                var p_b = sprite[(sprite_index<<2)+2]; //col&0xFF;


                if(1/w < depth_buffer[index]){
                    map_data[(index<<2)] =   p_r*(keys[69]?alpha:1);
                    map_data[(index<<2)+1] = p_g*(keys[69]?beta:1);
                    map_data[(index<<2)+2] = p_b*(keys[69]?gamma:1);
                    map_data[(index<<2)+3] = 255;
                    depth_buffer[index] = 1/w;
                }
                                
            }
        }

    }
}


function drawTri(tri_info){

  var tri = tri_info[0];
  var mat4 = tri_info[1];
  var col = tri_info[2];
  var normal = tri_info[3];
  var texture_coords = tri_info[4];

  var p0 = transform(tri[0],mat4);
  var p1 = transform(tri[1],mat4);
  var p2 = transform(tri[2],mat4);

  var v0 = apply_pers_proj(apply_cam(p0)); 
  var v1 = apply_pers_proj(apply_cam(p1));
  var v2 = apply_pers_proj(apply_cam(p2));

  console.log(texture_coords);

  var n_x = (v1[1]-v0[1])*(v2[2]-v1[2])-(v1[2]-v0[2])*(v2[1]-v1[1]);
  var n_y = (v1[2]-v0[2])*(v2[0]-v1[0])-(v1[0]-v0[0])*(v2[2]-v1[2]);
  var n_z = (v1[0]-v0[0])*(v2[1]-v1[1])-(v1[1]-v0[1])*(v2[0]-v1[0]);

  drawLine(v0,v1,v2,true,n_x,n_y,n_z,col);
  drawLine(v1,v2,v0,true,n_x,n_y,n_z,col);
  drawLine(v2,v0,v1,true,n_x,n_y,n_z,col);


  if(!WireFrameView){
      rasterize(

        v0,
        v1,
        v2,

        n_x,
        n_y,
        n_z,

        tri_info,

        col,

        texture_coords
      );
  }

}

function clearMap(){
    for (var i=0; i<map_data.length; i+=4) {
        map_data[i]=0;
        map_data[i+1]=0;
        map_data[i+2]=0;
    }
}

///////// STATUS INDICATORS //////////

function drawCamIndicators(){

  drawLine(new vec3(0,0),cam.right_vec.mult(aspect_ratio*.1) );
  drawLine(new vec3(0,0),cam.up_vec.mult(aspect_ratio*.1));
  drawLine(new vec3(0,0),cam.foward_vec.mult(aspect_ratio*.1));
}

function displayStatus(){
    ctx.fillStyle="white";
    ctx.font = "15px Arial";
    ctx.fillText(`Position: ${cam.pos.x}, ${cam.pos.y}, ${cam.pos.z}`, 10, 25);
    ctx.fillText(`Orientation: ${cam.rx}, ${cam.ry}, ${cam.rz}`, 10, 45);
    ctx.fillText(`Performance: ${ticks}, ${frames} / ${updated_ticks}, ${updated_frames} (1s interval)`, 10, 65);
    ctx.fillText(`FOV: ${fov}`, 10, 85);
    ctx.fillText(`# of entities: ${entities.length}`, 10, 105);
    ctx.fillText(`# of tris (culling enabled): ${tris_queue.length}`, 10, 125);

}


function renderTris(){
   for(var i=0; i<tris_queue.length; i++){
        drawTri(tris_queue[i]);
    }
}


function queueTris(entity){
  for(var i=0; i<entity.tris.length; i++){

        var tri = entity.tris[i];

        var pos_x = entity.mat4.pos.x;
        var pos_y = entity.mat4.pos.y;
        var pos_z = entity.mat4.pos.z;

        var cam_x = cam.pos.x;
        var cam_y = cam.pos.y;
        var cam_z = cam.pos.z;

        var p1 = transform(tri[0],entity.mat4);
        var p2 = transform(tri[1],entity.mat4);
        var p3 = transform(tri[2],entity.mat4);

        var center = [
                      (p1[0]+p2[0]+p3[0])/3, 
                      (p1[1]+p2[1]+p3[1])/3, 
                      (p1[2]+p2[2]+p3[2])/3
                    ];


        var normal = CROSS(
                           UNIT([p3[0]-p2[0],p3[1]-p2[1],p3[2]-p2[2]]),
                           UNIT([p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]])
                     );


        var view_proj = DOT(UNIT([
            (pos_x+(center[0]-pos_x))-cam_x, 
            (pos_y+(center[1]-pos_y))-cam_y, 
            (pos_z+(center[2]-pos_z))-cam_z]
        ),normal);


        if(view_proj < 0){
            tris_queue.push([tri, entity.mat4, entity.col, normal, entity.texture_coords[i]]);
        }
    }
}



function render(){
  if(!map_data) return;
 
  tris_queue=[];

  for (var i=0; i<depth_buffer.length; i++) depth_buffer[i] = 0xFFFFFF;

  for (var i=0; i<map_data.length; i+=4) {
     map_data[i] = rgb_r(bg_col);
     map_data[i+1] = rgb_g(bg_col);
     map_data[i+2] = rgb_b(bg_col);
     map_data[i+3] = 0;
   }

  for(var i=0; i<entities.length; i++){
    queueTris(entities[i]); //Vertice Buffer
  }

  renderTris() 
 
  if(keys[69]) drawCamIndicators();
  
  ctx.putImageData(imgData,0,0);

  if(cmd_prmpt_enabled){
      ctx.fillStyle="black";
      ctx.fillRect(0,canvas.height-50,canvas.width,35);
      
      ctx.fillStyle="white";
      ctx.font = "20px Courier New";
      ctx.fillText(`${cmd_prmpt}${'|'}`, 10, canvas.height-30);
  }

  if(keys[69] && !cmd_prmpt_enabled) displayStatus();
}



function lerp(a,b,t){ return a+(b-a)*t }

function vec_lerp(a,b,t){
    return a.add(b.sub(a)).mult(t);
}

function update(dt){
  
    if(!running) return;
    a+=.1;
    if(a>=2*pi)a=0;

    var flat_foward = physics_enabled ? new vec3(sin(cam.ry),0,cos(cam.ry)) : cam.foward_vec;

    if(physics_enabled){
      velocity = velocity.add(new vec3(0,-.9/canvas.height,0));

      if(plr_pos.y+velocity.y <= 0){
          plr_pos.y = 0;
          velocity = new vec3(0,0,0);
      }

      plr_pos = plr_pos.add(velocity);
    }
    cam.pos = plr_pos.add(new vec3(0,2,0));
    //player_cube.mat4.pos = plr_pos;

    if(!cmd_prmpt_enabled){
        if (keys[65]) plr_pos = plr_pos.sub(cam.right_vec.mult(cam_spd/canvas.width));
        if (keys[68]) plr_pos = plr_pos.add(cam.right_vec.mult(cam_spd/canvas.width));

        if (keys[83]) plr_pos = plr_pos.sub(flat_foward.mult(cam_spd/canvas.width));
        if (keys[87]) plr_pos = plr_pos.add(flat_foward.mult(cam_spd/canvas.width));

        if (keys[37]) cam.rot(0,-rad(1),0);
        if (keys[39]) cam.rot(0,rad(1),0);

        if (keys[38]) cam.rot(-rad(1),0,0);
        if (keys[40]) cam.rot(rad(1),0,0);
    }

  //  player_cube.mat4.rot(0,rad(1),rad(1.5));
  //player_cube.mat4.pos = new vec3(cos(a),sin(a)+1.5,2);
    
    cam_spd = keys[16]?30:15;

    cam.rx = Math.max(Math.min(cam.rx,rad(y_rot_bound)),rad(-y_rot_bound));
    
    if(focused){
        var flag0 = (cam.rx>=rad(y_rot_bound));
        var flag1 = (cam.rx<=-rad(y_rot_bound));

        var except = (((delta_y<0&&flag1)||(delta_y>0&flag0))?0:1);
        cam.rot(0,rad(delta_x*mouse_sensitivity),0);
        cam.rot(rad(delta_y*mouse_sensitivity)*except,0,0);
    }
    
  delta_x = lerp(delta_x, m_x-last_x, 1);
  delta_y = lerp(delta_y, m_y-last_y, 1);

  last_x = m_x;
  last_y = m_y;  
}

function read(commands){
    var func = commands[0];
        
    switch(func){
        case 'set':
          var variable = commands[1];
          this[variable] = commands[2];      
        break;
        case 'run':
          eval(commands[1]);
        break;
        case 'freeze':
            running=false;
        break;
        case 'unfreeze':
            running=true;
        break;
    }
}

document.addEventListener("mousemove",function(event){
    var rect = canvas.getBoundingClientRect();
    client_x = Math.max(Math.min(event.clientX-rect.left,canvas.width),0);
    client_y = Math.max(Math.min(event.clientY-rect.top,canvas.height),0);

    m_x += event.movementX;
    m_y += event.movementY;
});

document.addEventListener("keydown",function(event){
  keys[event.keyCode] = true;

  if(cmd_prmpt_enabled){
      if(event.location==0 && event.keyCode!=8 && event.keyCode!=13) cmd_prmpt+=event.key;
      if(event.keyCode==8) cmd_prmpt = cmd_prmpt.slice(0,cmd_prmpt.length-1);
  }
  if(event.keyCode == 86) WireFrameView = !WireFrameView;
  if(event.keyCode==13){
    cmd_prmpt_enabled = false;
    var commands = cmd_prmpt.split(" ");
    try{
        read(commands);
    }catch(err){
        console.log(err);
    }
  }

  switch(event.keyCode){
    case 191:
      cmd_prmpt_enabled = true;
    break;
  }

  if(event.keyCode==32 && !cmd_prmpt_enabled){
      plr_pos.y += .1/canvas.height; 
      velocity = velocity.add(new vec3(0,30/canvas.height,0));
  }
});

document.addEventListener("keyup",function(event){
  keys[event.keyCode] = false;
});

canvas.addEventListener("mousedown",function(){
  canvas.requestPointerLock({
    unadjustedMovement: true,
  });
  mouse_down=true;
},false);

document.addEventListener("pointerlockchange", function(event){
    focused=document.pointerLockElement?true:false;
});

document.addEventListener("mouseup",function(){
  mouse_down=false;
});

function init(){
  var now = Date.now();
  delta+=(now-lastTime)/fps;
  lastTime = now;
 
  while(delta>=1){
      delta--;
      update(delta);
      ticks++;
  }
 
  frames++;
  render();
 
  if(Date.now() - lastFPSReq >= 1000){
      updated_frames = frames;
      updated_ticks = ticks;
      frames=0;
      ticks=0;
      lastFPSReq = Date.now();
  }
 
  window.requestAnimationFrame(init);
}



window.requestAnimationFrame(init);