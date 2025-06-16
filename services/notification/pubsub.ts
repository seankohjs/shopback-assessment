/**
 * Simple PubSub mechanism for handling notifications
 * This is a simplified implementation for demo purposes
 * In a production environment, consider using a proper message broker like RabbitMQ or Redis
 */
class PubSub {
  private subscribers: Record<string, Array<(data: any) => void>>;
  
  constructor() {
    this.subscribers = {};
  }
  
  /**
   * Subscribe to a topic
   * @param topic Topic name
   * @param callback Callback function to execute when a message is published to the topic
   * @returns Unsubscribe function
   */
  subscribe(topic: string, callback: (data: any) => void): () => void {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = [];
    }
    
    this.subscribers[topic].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers[topic] = this.subscribers[topic].filter(cb => cb !== callback);
    };
  }
  
  /**
   * Publish a message to a topic
   * @param topic Topic name
   * @param data Message data
   */
  publish(topic: string, data: any): void {
    if (!this.subscribers[topic]) {
      console.log(`No subscribers for topic: ${topic}`);
      return;
    }
    
    // Log for debugging
    console.log(`Publishing to ${topic}:`, data);
    
    // Notify all subscribers
    this.subscribers[topic].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error executing subscriber callback for topic ${topic}:`, error);
      }
    });
  }
  
  /**
   * Get the number of subscribers for a topic
   * @param topic Topic name
   * @returns Number of subscribers
   */
  getSubscriberCount(topic: string): number {
    return this.subscribers[topic]?.length || 0;
  }
  
  /**
   * Clear all subscribers for a topic
   * @param topic Topic name
   */
  clearSubscribers(topic: string): void {
    this.subscribers[topic] = [];
  }
}

// Create a singleton instance
export const pubsub = new PubSub();

// Default subscribers for demo purposes
pubsub.subscribe('user:notification', (data) => {
  console.log(`📧 Would send email to user ${data.userId}: ${data.title}`);
});

pubsub.subscribe('admin:notification', (data) => {
  console.log(`🔔 Would alert admin dashboard: ${data.title}`);
});

export default pubsub; 