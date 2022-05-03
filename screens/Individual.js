import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Button, Pressable, TouchableWithoutFeedback, Keyboard, Image, TouchableOpacity, ScrollView, TextInput, Alert} from 'react-native';
import {db, ROOT_REF} from '../firebase/Config';
import { ref, update } from "firebase/database";
import styles from '../style';
import MicFAB from '../components/MicFAB';
import trashRed from '../icons/trash-red.png';
import sort from '../icons/sort.png';
import Voice from '@react-native-community/voice';

export default function Individual({navigation, route}) {
    const [index, setIndex] = useState(null);
    const [cowName, setCowName] = useState('');
    const [temperature, setTemperature] = useState('');
    const [procedures, setProcedures] = useState({});
    const [newProcedureDesc, setNewProcedureDesc] = useState('');
    const timestampUnix = Date.now();
    const dateObject = new Date(timestampUnix);
    const time = dateObject.toLocaleTimeString().substring(0, 5);
    const month = dateObject.getMonth()+1;
    const date = dateObject.getDate()+"."+month+"."+dateObject.getFullYear();
    const [newFirst, setNewFirst] = useState(true);
    const [cow, setCow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [updatedDesc, setUpdatedDesc] = useState('');

    const [voiceText, setVoiceText] = useState('');
    const commands = [
        {
            command: "nimi",
        },
        {
            command: "ruumiinlämpö",
        },
        {
            command: "toimenpide",
        },
    ];

    useEffect(() => {
        Voice.destroy().then(Voice.removeAllListeners);
        Voice.onSpeechStart = onSpeechStartHandler;
        Voice.onSpeechRecognized = onSpeechRecognizedHandler;
        Voice.onSpeechEnd = onSpeechEndHandler;
        Voice.onSpeechPartialResults = onSpeechPartialResultsHandler;
        Voice.onSpeechResults = onSpeechResultsHandler;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        }
    }, [])

    const onSpeechStartHandler = (e) => {
        console.log("start handler individual==>>>", e)
    }

    const onSpeechRecognizedHandler = (e) => {
        console.log("Recognizer individual==>>>", e)
    }

    const onSpeechEndHandler = (e) => {
        console.log("stop handler", e)
        Voice.start('fi-FI')
    }

    const onSpeechPartialResultsHandler = (e) => {
        setVoiceText((e.value[0]).toLocaleLowerCase())
        commands.forEach((item) => {
            if ((e.value[0]).includes(item.command)) {
                if (item.command == "nimi") {
                    setCowName((e.value[0]).replace(item.command, " ").trim())
                } if (item.command == "ruumiinlämpö") {
                    setTemperature((e.value[0]).replace(item.command, " ").trim())
                } if (item.command == "toimenpide") {
                    setNewProcedureDesc((e.value[0]).replace(item.command, " ").trim())
                } 
            }
            console.log(voiceText)
        });
    }

    const onSpeechResultsHandler = (e) => {
        console.log("speech result handler", e)
    }

    const startRecording = async () => {
        try {
            await Voice.start('fi-FI')
        } catch (error) {
            console.log("error", error)
        }
    }

    const stopRecording = async () => {
        try {
            await Voice.stop()
        } catch (error) {
            console.log("error", error)
        }
    }

    useEffect(() => {
            if (route.params?.cow) {
                setCow(route.params?.cow)
                setCowName(route.params?.cow.name);
                setTemperature(route.params?.cow.temperature);
                setProcedures(route.params?.cow.procedures);
                setIndex(route.params?.key);
                setLoading(false);               
            } else {
                Alert.alert("Virhe","Vasikan tietojen haku epäonnistui.",[{ text: "OK", onPress: () => navigation.navigate("Home") }]);
            } 
        
        }, [])
    let procedureIDs = Object.keys(procedures).reverse(); //new entries first
    let procedureIDsAsc = Object.keys(procedures); //old entries first

    useEffect(() => {
        setLoading(false);
        if (route.params?.procedureEdited) {
            setProcedures(route.params?.cow.procedures);

                const newArray = [...procedures];
                newArray[route.params?.procedureEditedID].description = route.params?.procedureEdited;
                setUpdatedDesc(route.params?.procedureEdited);
                procedureIDs = Object.keys(procedures).reverse(); //new entries first
                procedureIDsAsc = Object.keys(procedures); //old entries first
        }
   
    }, [route.params?.procedureEdited,])

    
    function saveChanges() {
        let upToDateProcedures = procedures;
        let saveData = {};
        let nameFormatted = cowName.charAt(0).toUpperCase() + cowName.slice(1);
        let temperatureFormatted = temperature.toString().replace(/,/g, '.');
        // Json parse used to prevent sending undefined values to database (undefined is not allowed)
        if (procedures && newProcedureDesc) { 
            // if user logged new procedure while editing AND prev. procedures exist
            let proceduresToArray = Array.from(procedures);
            let procedureFormatted = '';
            if (newProcedureDesc.endsWith('.') || newProcedureDesc.endsWith('!') || newProcedureDesc.endsWith('?')) {
                procedureFormatted = newProcedureDesc.charAt(0).toUpperCase() + newProcedureDesc.slice(1);
            } else {
                procedureFormatted = newProcedureDesc.charAt(0).toUpperCase() + newProcedureDesc.slice(1)+'.';
            }
            proceduresToArray.splice(procedures.length, 0, {description:procedureFormatted, time: time, date:date});  
            saveData = JSON.parse(JSON.stringify({ 
                name: nameFormatted,
                temperature: temperatureFormatted,
                procedures: proceduresToArray
              }))
       
        } else if (!procedures && newProcedureDesc) { // ok
            // prev. procedures do not exist BUT user logged the first one now
            let procedureFormatted = '';
            if (newProcedureDesc.endsWith('.') || newProcedureDesc.endsWith('!') || newProcedureDesc.endsWith('?')) {
                procedureFormatted = newProcedureDesc.charAt(0).toUpperCase() + newProcedureDesc.slice(1);
            } else {
                procedureFormatted = newProcedureDesc.charAt(0).toUpperCase() + newProcedureDesc.slice(1)+'.';
            }
            upToDateProcedures = {
                1: {
                 description: procedureFormatted,
                 date: date,
                 time: time
                }}; 
                saveData = JSON.parse(JSON.stringify({ 
                    name: nameFormatted,
                    temperature: temperatureFormatted,
                    procedures: upToDateProcedures
                  }))
        } else if (procedures && !newProcedureDesc) {
            saveData = JSON.parse(JSON.stringify({ 
                name: nameFormatted,
                temperature: temperatureFormatted,
                procedures: procedures
              }))
        } else {
            saveData = JSON.parse(JSON.stringify({ 
                name: nameFormatted,
                temperature: temperatureFormatted,
                procedures: ""
              }))
        } // 
        update(ref(db, ROOT_REF + index), saveData)
        .then(() => {
            navigation.navigate('Home'); // Data saved successfully!
          })
          .catch((error) => {
            alert (error)   // The write failed...
          });
          
    }
    
     // asking for confirmation first before removing calf
  const confirmBeforeRemove = () => Alert.alert(
    "Tietojen poistaminen", "Oletko varma, että haluat poistaa vasikan #"+index+ " tietokannasta?", 
    [
      {
        text: "Ei, älä poista.",
        onPress: () => console.log('Cancel pressed'),
      },
      {
        text: "Kyllä, poista.", onPress: () => removeThisCow()
      }
  ],
  {cancelable: false}
  );


      function removeThisCow() {
        db.ref(ROOT_REF + index).remove();
        navigation.navigate('Home');
        // navigation.goBack();

        return;
      }

      function toggleOrder() {
          setNewFirst(!newFirst);
      }

    return (
        
        <View style={styles.main}>
                <View style={styles.titleRow}>            
                    <Text style={styles.header}>Vasikka #{index}</Text>
                    <TouchableOpacity onPress={() => confirmBeforeRemove()} style={{flexDirection:'row',justifyContent: 'flex-end',position: "absolute", right: 10,}}>
                        <Image source={trashRed} style={{height: 20, width: 20}} />
                        <Text style={{marginLeft: 5,fontSize: 15, color: '#8c0010'}} >Poista vasikka</Text>
                    </TouchableOpacity>
                </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View>
                    <Text style={styles.textInputLabel}>Nimi</Text>
                        <TextInput style={styles.textInput} placeholderTextColor='#a3a3a3' 
                            placeholder='Vasikan nimi (valinnainen)'
                            value={cowName} onChangeText={setCowName}/>

                        <Text style={styles.textInputLabel}>Ruumiinlämpö (°C)</Text>
                        <TextInput style={styles.textInput} placeholderTextColor='#a3a3a3' 
                            placeholder='Vasikan ruumiinlämpö (valinnainen)' value={temperature}
                            onChangeText={setTemperature} keyboardType='numeric' />

                        <Text style={styles.textInputLabel}>Toimenpiteet</Text>
                        <Text>➥ Uusi toimenpide   {date}, {time}</Text>

                        <TextInput style={styles.textInput} placeholderTextColor='#a3a3a3' 
                            placeholder='Vapaa kuvaus ...' value={newProcedureDesc}
                            onChangeText={setNewProcedureDesc} multiline={true}/>
                </View>
                </TouchableWithoutFeedback>

            {!loading ? 
            <>
            {procedures ? // Procedures have been logged before
                        <>
                        <View style={{flexDirection: 'row'}}>
                            
                            <Text style={{color: 'black'}}>Aiemmat toimenpiteet ({procedureIDs.length})</Text>
                            <TouchableOpacity style={{right: 10, position: 'absolute', flexDirection: 'row'}} onPress={() => toggleOrder()}>
                            <Image source={sort} style={{height: 15, width: 15}} />
                                <Text style={styles.textInputLabel}>{newFirst ? "  Uusin ensin" : "  Vanhin ensin"}</Text>
                            </TouchableOpacity>
                        </View>
                    <View style={{maxHeight: '40%'}}>
                    <ScrollView style={styles.procedureList}>
                        {newFirst ? 
                        <>
                            {procedureIDs.map(key => ( 
                            
                        <View key={key} style={{marginBottom: 10}}>
                            <View 
                                style={{flexDirection: 'row', paddingVertical: 5, paddingLeft: 5}}>
                                <View style={{width: '75%'}}>
                                    <Text style={{fontStyle: 'italic'}}>{procedures[key].date}, {procedures[key].time}</Text>
                                
                                </View>
                                    
                                  <TouchableOpacity style={styles.editProcedureText}
                                    onPress={() => navigation.navigate('EditProcedure', {procedureIDs: procedureIDs,cow: cow, cowID: index, procedureID: key})}>
                                    <Text>Muokkaa</Text>
                                </TouchableOpacity>
                            </View> 
                            
            
                                 {route.params?.procedureEdited && procedures[key] === route.params?.procedureEditedID ? 
                                <Text style={styles.procedureListDesc}>"{updatedDesc}"</Text> 
                                : 
                                <Text style={styles.procedureListDesc}>"{procedures[key].description}"</Text>}
                             
            
                            </View>
                        
                            ))}
                            </>
                            :
                                <>
                        {procedureIDsAsc.map(key => ( 
                    
                            <View key={key} style={{marginBottom: 10}}>
                            <View 
                                style={{flexDirection: 'row', paddingVertical: 5, paddingLeft: 5}}>
                                <View style={{width: '75%'}}>
                                    <Text style={{fontStyle: 'italic'}}>{procedures[key].date}, {procedures[key].time}</Text>
                                
                                </View>
                                  <TouchableOpacity style={styles.editProcedureText}
                                    onPress={() => navigation.navigate('EditProcedure', {procedureIDs: procedureIDs,cow: cow, cowID: index, procedureID: key})}>
                                    <Text>Muokkaa</Text>
                                </TouchableOpacity>
                            </View>                                 
                                
                                 {route.params?.procedureEdited && procedures[key] === route.params?.procedureEditedID ? 
                                <Text style={styles.procedureListDesc}>"{updatedDesc}"</Text> 
                                : 
                                <Text style={styles.procedureListDesc}>"{procedures[key].description}"</Text>}
                                
                                 
                            </View>
                            ))}
                            </>
                            }</ScrollView></View>
                        </>
                        : // No procedures logged before
                        <Text style={{fontStyle: 'italic', marginLeft: 10, marginBottom: 10}}>Ei aiempia toimenpiteitä.</Text>
                        }
                        </>
            : <Text style={{marginLeft: 10}}>Toimenpiteitä ladataan...</Text>}
            

           
           
        <View style={{marginBottom: 30, marginRight: 10}}>
            <TouchableOpacity style={styles.customButton} onPress={() => saveChanges()}>
                <Text style={styles.buttonText}>Tallenna muutokset</Text>
            </TouchableOpacity>       
        </View>       
            
            <MicFAB title="microphone-on" onPress={startRecording} />

        </View>
        
    )
}

