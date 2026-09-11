package ink.nilsson.myonlinetv

import android.content.Context
import java.util.UUID

class DeviceIdentity(context:Context) {
    private val prefs=context.getSharedPreferences("myonline-device",Context.MODE_PRIVATE)
    fun id():String {
        var v=prefs.getString("deviceId",null)
        if(v.isNullOrBlank()) {
            v=UUID.randomUUID().toString()
            prefs.edit().putString("deviceId",v).apply()
        }
        return v
    }
    fun name():String = prefs.getString("deviceName","Android TV") ?: "Android TV"
    fun setName(value:String)=prefs.edit().putString("deviceName",value).apply()
}
