
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Note: In a real app, you'd want to add proper error handling and type definitions.
// For now, these functions will return 'any' for simplicity.

export async function getTools(): Promise<any[]> {
    try {
        const toolsCollection = collection(db, 'tools');
        const toolsSnapshot = await getDocs(toolsCollection);
        const tools = toolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ---- INJECT NEW TOOL ----
        const marketingCalendarTool = {
            id: "marketing-calendar",
            title: "تقويم التسويق 2025",
            description: "تقويم عملي ومذهل مصمم للمطاعم السعودية، مليء بالأفكار المبتكرة والواقعية التي يمكنك تنفيذها فوراً.",
            category: "marketing",
            price_label: "مجاني",
            icon: "CalendarDays",
            color: "text-blue-500",
            bg_color: "bg-blue-500/10",
            popular: true,
            type: "free",
        };
        
        // Avoid duplicates if it's already there
        if (!tools.some(tool => tool.id === marketingCalendarTool.id)) {
            tools.push(marketingCalendarTool);
        }
        // ---- END INJECTION ----

        return tools;
    } catch (error) {
        console.error("Error fetching tools:", error);
        return [];
    }
}


export async function getMenuByRestaurantId(restaurantId: string): Promise<any[]> {
  try {
    const menuItemsCollection = collection(db, 'restaurants', restaurantId, 'menu_items');
    const querySnapshot = await getDocs(menuItemsCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching menu items by restaurant ID:', error);
    return [];
  }
}
