bl_info={"name":"Canvas Studio Live Bridge","author":"Canvas Studio","version":(2,4,0),"blender":(3,6,0),"location":"View3D > Sidebar > Canvas Studio","category":"3D View"}
import bpy,json,urllib.request

def req(url,method='GET',payload=None,token=''):
    data=json.dumps(payload).encode() if payload is not None else None
    r=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json','X-Canvas-Bridge-Token':token},method=method)
    return json.loads(urllib.request.urlopen(r,timeout=5).read().decode())
def export_scene(c):
    out={'camera':{},'objects':[],'paths':[]};s=c.scene
    if s.camera:
        o=s.camera;out['camera']={'name':o.name,'x':o.location.x,'y':o.location.z,'z':-o.location.y,'fov':o.data.angle*57.2958}
    for o in s.objects:
        if o.type not in {'MESH','EMPTY','ARMATURE','CAMERA'}:continue
        out['objects'].append({'id':o.get('canvas_id',o.name),'name':o.name,'type':'camera' if o.type=='CAMERA' else ('gltf' if o.type=='ARMATURE' else 'cube'),'x':o.location.x,'y':o.location.z,'z':-o.location.y,'sx':o.scale.x,'sy':o.scale.z,'sz':o.scale.y,'visible':not o.hide_viewport})
    return out
def apply_scene(c,data):
    for x in data.get('objects',[]):
        o=bpy.data.objects.get(x.get('name','Canvas Object'))
        if o is None:
            if x.get('type')=='camera': cam=bpy.data.cameras.new(x.get('name','Camera'));o=bpy.data.objects.new(cam.name,cam);c.collection.objects.link(o)
            else: bpy.ops.mesh.primitive_cube_add();o=c.active_object;o.name=x.get('name','Canvas Object')
        o['canvas_id']=x.get('id',o.name);o.location=(float(x.get('x',0)),-float(x.get('z',0)),float(x.get('y',0)));o.scale=(float(x.get('sx',1)),float(x.get('sz',1)),float(x.get('sy',1)));o.hide_viewport=not bool(x.get('visible',True))
class Push(bpy.types.Operator):
    bl_idname='canvas_bridge.push';bl_label='发送到 Canvas'
    def execute(self,c):
        try:req(c.scene.canvas_bridge_server.rstrip('/')+'/api/blender/bridge/push','POST',{'direction':'blender_to_canvas','source':'blender','scene':export_scene(c)},c.scene.canvas_bridge_token);c.scene.canvas_bridge_status='已发送';return{'FINISHED'}
        except Exception as e:self.report({'ERROR'},str(e));return{'CANCELLED'}
class Pull(bpy.types.Operator):
    bl_idname='canvas_bridge.pull';bl_label='从 Canvas 接收'
    def execute(self,c):
        try:
            out=req(c.scene.canvas_bridge_server.rstrip('/')+'/api/blender/bridge/poll?direction=canvas_to_blender&since=%d'%c.scene.canvas_bridge_version,token=c.scene.canvas_bridge_token);p=out.get('packet')
            if out.get('changed') and p:apply_scene(c,p.get('scene',{}));c.scene.canvas_bridge_version=int(p.get('version',0));c.scene.canvas_bridge_status='已接收 v%d'%c.scene.canvas_bridge_version
            else:c.scene.canvas_bridge_status='没有新场景'
            return{'FINISHED'}
        except Exception as e:self.report({'ERROR'},str(e));return{'CANCELLED'}
def timer():
    for s in bpy.data.scenes:
        if not getattr(s,'canvas_bridge_auto',False):continue
        try:
            out=req(s.canvas_bridge_server.rstrip('/')+'/api/blender/bridge/poll?direction=canvas_to_blender&since=%d'%s.canvas_bridge_version,token=s.canvas_bridge_token);p=out.get('packet')
            if out.get('changed') and p:apply_scene(bpy.context,p.get('scene',{}));s.canvas_bridge_version=int(p.get('version',0));s.canvas_bridge_status='自动同步 v%d'%s.canvas_bridge_version
        except Exception as e:s.canvas_bridge_status='同步失败: '+str(e)[:48]
    return 1.0
class Panel(bpy.types.Panel):
    bl_label='Canvas Studio';bl_idname='CANVAS_PT_bridge';bl_space_type='VIEW_3D';bl_region_type='UI';bl_category='Canvas Studio'
    def draw(self,c):
        l=self.layout;s=c.scene;l.prop(s,'canvas_bridge_server',text='Server');l.prop(s,'canvas_bridge_token',text='Token');r=l.row(align=True);r.operator('canvas_bridge.push');r.operator('canvas_bridge.pull');l.prop(s,'canvas_bridge_auto',text='自动同步 1s');l.label(text=s.canvas_bridge_status)
classes=(Push,Pull,Panel)
def register():
    [bpy.utils.register_class(c) for c in classes];bpy.types.Scene.canvas_bridge_server=bpy.props.StringProperty(default='http://127.0.0.1:8080');bpy.types.Scene.canvas_bridge_token=bpy.props.StringProperty(default='');bpy.types.Scene.canvas_bridge_version=bpy.props.IntProperty(default=0);bpy.types.Scene.canvas_bridge_auto=bpy.props.BoolProperty(default=False);bpy.types.Scene.canvas_bridge_status=bpy.props.StringProperty(default='未连接');bpy.app.timers.register(timer,persistent=True)
def unregister():
    [bpy.utils.unregister_class(c) for c in reversed(classes)]
if __name__=='__main__':register()
