import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const ChannelList = ({ channels }) => {
  const currentPath = usePathname()

  const createLi = (channel) => {
    const isActive = currentPath === channel.path
    
    return (
      <li key={channel.path}>
        <Link
          href={channel.path}
          className={clsx(
            'flex items-center px-3 py-2 rounded-md transition-colors',
            {
              'bg-blue-100 font-semibold text-blue-700': isActive,
              'hover:bg-gray-100 text-gray-700': !isActive,
            }
          )}
        >
          {channel.label}
        </Link>
      </li>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 mb-2 px-3">Channels</h2>
      <ul className="space-y-1">{channels.map(createLi)}</ul>
    </div>
  )
}

export default ChannelList