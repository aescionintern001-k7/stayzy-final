import React,{useState} from "react";
import {ScrollView,Pressable,Text,View} from "react-native";
import {Redirect} from "expo-router";
import {Editorial,sections,labels,Section} from "../../src/components/Editorial";
import {useRole} from "../../src/context/RoleContext";
export default function Content(){const [section,select]=useState<Section>("home");if(useRole().role!=="ADMIN")return <Redirect href="/"/>;return <ScrollView><View style={{flexDirection:"row",flexWrap:"wrap",gap:8,padding:16}}>{sections.map(k=><Pressable key={k} onPress={()=>select(k)} style={{padding:12,borderRadius:20,backgroundColor:k===section?"#28262a":"#f0eff0"}}><Text style={{color:k===section?"white":"#28262a"}}>{labels[k]}</Text></Pressable>)}</View><Editorial key={section} section={section} editor/></ScrollView>}
