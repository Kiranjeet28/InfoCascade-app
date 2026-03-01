import { View } from 'react-native';

export default function BgBlobs() {
    return (
        <>
            <View
                style={{
                    position: 'absolute', width: 300, height: 300, borderRadius: 150,
                    backgroundColor: '#6C63FF', opacity: 0.06, top: -80, right: -90,
                }}
            />
            <View
                style={{
                    position: 'absolute', width: 200, height: 200, borderRadius: 100,
                    backgroundColor: '#00D9AA', opacity: 0.05, bottom: 150, left: -60,
                }}
            />
        </>
    );
}