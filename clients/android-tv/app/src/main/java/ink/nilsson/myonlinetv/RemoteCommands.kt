package ink.nilsson.myonlinetv

sealed class RemoteCommand {
    data object Play:RemoteCommand()
    data object Pause:RemoteCommand()
    data object Next:RemoteCommand()
    data object Previous:RemoteCommand()
    data class Volume(val level:Int):RemoteCommand()
    data class Tune(val channelKey:String):RemoteCommand()
    data class Search(val text:String):RemoteCommand()
}
