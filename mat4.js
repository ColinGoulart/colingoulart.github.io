class mat4{
  constructor(vec3){
     
      this.x=vec3.x;
      this.y=vec3.y;
      this.z=vec3.z;
 
      //rotations
      this.rx = 0;
      this.ry = 0;
      this.rz = 0;
      this.r = 0;
     
      //basis vectors
      this.right_vec = vec3;
      this.up_vec = vec3;
      this.foward_vec = vec3;

      //components
      this.m00=1;
      this.m01=0;
      this.m02=0;
     
      this.m10=0;
      this.m11=1;
      this.m12=0;
     
      this.m20=0;
      this.m21=0;
      this.m22=1;
     
      //position
      this.pos = vec3;
  }
  rotAxisAngle(vec3,angle){
 
      if(vec3.mag()==0){
          console.log('vec3 must have a mag. greater than 0.');
          return;
      }
     
      var u = vec3.unit();
      var r = this.r;
      
      this.r += angle;
             
      this.set(
             (cos(r)+pow(u.x,2)*(1-cos(r))),
             (u.x*u.y*(1-cos(r))-u.z*sin(r)),
             (u.x*u.z*(1-cos(r))+u.y*sin(r)),
  
             (u.y*u.x*(1-cos(r))+u.z*sin(r)),
             (cos(r)+pow(u.y,2)*(1-cos(r))),
             (u.y*u.z*(1-cos(r))-u.x*sin(r)),
  
             (u.z*u.x*(1-cos(r))-u.y*sin(r)),
             (u.z*u.y*(1-cos(r))+u.x*sin(r)),
             (cos(r)+pow(u.z,2)*(1-cos(r)))
      );
     
  }
  mult(m){
      var n_x = m.x*this.m00+m.y*this.m01+m.z*this.m02+this.x;
      var n_y = m.x*this.m10+m.y*this.m11+m.z*this.m12+this.y;
      var n_z = m.x*this.m20+m.y*this.m21+m.z*this.m22+this.z;
      return new mat4(new vec3(n_x,n_y,n_z));
  }
  set(m00,m01,m02,m10,m11,m12,m20,m21,m22){
      
      this.m00=m00;
      this.m01=m01;
      this.m02=m02;
     
      this.m10=m10;
      this.m11=m11;
      this.m12=m12;
     
      this.m20=m20;
      this.m21=m21;
      this.m22=m22;
  
      this.right_vec =  new vec3(this.m00,this.m10,this.m20);
      this.up_vec =     new vec3(this.m01,this.m11,this.m21);
      this.foward_vec = new vec3(this.m02,this.m12,this.m22);
      
  }
  rot(_rx,_ry,_rz){
 
      this.rx += _rx;
      this.ry += _ry;
      this.rz += _rz;
      
      if(abs(this.rx)>2*pi)this.rx=0;
      if(abs(this.ry)>2*pi)this.ry=0;
      if(abs(this.rz)>2*pi)this.rz=0;
     
      var rx = this.rx;
      var ry = this.ry;
      var rz = this.rz;
   
      this.set(
        (cos(ry)*cos(rz)),
        (sin(rx)*sin(ry)*cos(rz)-cos(rx)*sin(rz)),
        (cos(rx)*sin(ry)*cos(rz)+sin(rx)*sin(rz)),

        (cos(ry)*sin(rz)),
        (sin(rx)*sin(ry)*sin(rz)+cos(rx)*cos(rz)),
        (cos(rx)*sin(ry)*sin(rz)-sin(rx)*cos(rz)),

        -sin(ry),
        sin(rx)*cos(ry),
        cos(rx)*cos(ry)
      );
  }
  log(){
      console.log(`
          ${this.x},
          ${this.y},
          ${this.z},
          ${this.m00},
          ${this.m01},
          ${this.m02},
          ${this.m10},
          ${this.m11},
          ${this.m12},
          ${this.m20},
          ${this.m21},
          ${this.m22}
      `);
  }
}