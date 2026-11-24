import React from "react";
import {ScrollView,View,Text,Pressable} from "react-native";
import {CircleUserRound,LogOut,Mail,Phone} from "lucide-react-native";
import {useRole} from "../../src/context/RoleContext";
import {Editorial,sections,labels,Section} from "../../src/components/Editorial";
export default function Account(){
 const [section,select]=React.useState<Section|null>(null);
 const {user,logout}=useRole();
 return <ScrollView contentContainerStyle={{padding:24,gap:18,alignSelf:"center",width:"100%",maxWidth:760}}><CircleUserRound size={52} color="#252526" strokeWidth={1.4}/><Text style={{fontSize:30,fontWeight:"800"}}>{user.name}</Text><Text>{user.role}</Text><View style={{flexDirection:"row",gap:12}}><Mail size={19}/><Text selectable>{user.email}</Text></View><View style={{flexDirection:"row",gap:12}}><Phone size={19}/><Text>{user.phone||"Phone not provided"}</Text></View>{sections.filter(k=>k!=="home").map(k=><View key={k}><Pressable accessibilityRole="button" onPress={()=>select(section===k?null:k)} style={{paddingVertical:12,borderBottomWidth:1,borderColor:"#e5e5e5"}}><Text style={{fontWeight:"600"}}>{labels[k]}</Text></Pressable>{section===k&&<Editorial key={k} section={k}/>}</View>)}<Pressable accessibilityRole="button" onPress={logout} style={{paddingVertical:16,flexDirection:"row",gap:12}}><LogOut color="#be193c" size={20}/><Text style={{color:"#be193c",fontWeight:"700"}}>Sign out</Text></Pressable></ScrollView>
}
