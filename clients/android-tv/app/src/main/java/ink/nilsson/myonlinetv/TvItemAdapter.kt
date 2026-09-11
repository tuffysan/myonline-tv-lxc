package ink.nilsson.myonlinetv

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import ink.nilsson.myonlinetv.databinding.ItemTvRowBinding

class TvItemAdapter(
    private val items: MutableList<TvItem>,
    private val onClick:(TvItem)->Unit
): RecyclerView.Adapter<TvItemAdapter.Holder>() {

    class Holder(val b: ItemTvRowBinding): RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val b=ItemTvRowBinding.inflate(LayoutInflater.from(parent.context),parent,false)
        return Holder(b)
    }

    override fun onBindViewHolder(h: Holder, position: Int) {
        val item=items[position]
        h.b.title.text=item.title
        h.b.subtitle.text=item.subtitle
        h.b.root.setOnClickListener{ onClick(item) }
        h.b.root.isFocusable=true
    }

    override fun getItemCount()=items.size

    fun replace(newItems:List<TvItem>) {
        items.clear(); items.addAll(newItems); notifyDataSetChanged()
    }
}
