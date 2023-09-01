class vec3{
  constructor(x,y,z){
      this.x=x;
      this.y=y;
      this.z=z;
  }
  add(vecb){
    return new vec3(this.x+vecb.x,this.y+vecb.y,this.z+vecb.z);
  }
  sub(vecb){
    return new vec3(this.x-vecb.x,this.y-vecb.y,this.z-vecb.z);
  }
  inv(){
    return new vec3(-this.x,-this.y,-this.z);
  }
  mult(s){
      return new vec3(this.x*s,this.y*s,this.z*s);
  }
  div(s){
      return new vec3(this.x/s,this.y/s,this.z/s);
  }
  dot(vecb){
      return this.x*vecb.x+this.y*vecb.y+this.z*vecb.z;
  }
  cross(vecb){
      return new vec3(
            this.y*vecb.z - this.z*vecb.y,
            this.z*vecb.x - this.x*vecb.z,
            this.x*vecb.y - this.y*vecb.x
        );
  }
  unit(){
  return new vec3(this.x/this.mag(),this.y/this.mag(),this.z/this.mag());
  }
  mag(){
      return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
  }
  log(){
      console.log(`${this.x}, ${this.y}, ${this.z}`);
  }
}